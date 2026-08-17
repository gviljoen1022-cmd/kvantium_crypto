-- PQC Engagement Tracker — full schema
-- Run this once in the Supabase SQL editor (Project > SQL Editor > New query)
--
-- This is a FULL REPLACEMENT of the old Stakeholders/Commercials/Timeframes/
-- Actions/Evidence/Artifacts scaffold. Running this drops that schema and
-- revokes the app's access to the `evidence` storage bucket (Supabase
-- blocks direct SQL deletion of buckets — delete it manually in
-- Dashboard → Storage afterwards if you want it gone entirely). The
-- `artifacts` storage bucket and its data are left untouched — only the
-- `artifacts` table is recreated — so no previously uploaded files are
-- deleted from storage by this script.

create extension if not exists "uuid-ossp";

-- ── Drop old schema ──────────────────────────────────────────

drop table if exists dashboard_layouts cascade;
drop table if exists evidence cascade;
drop table if exists artifacts cascade;
drop table if exists actions cascade;
drop table if exists timeframes cascade;
drop table if exists commercials cascade;
drop table if exists stakeholders cascade;
drop table if exists projects cascade;

drop policy if exists "auth read evidence files" on storage.objects;
drop policy if exists "auth write evidence files" on storage.objects;
drop policy if exists "auth delete evidence files" on storage.objects;
-- Supabase blocks direct `delete from storage.buckets` (a protective
-- trigger requires the Storage API instead). The policies above are
-- dropped so the bucket is no longer readable/writable by the app; to
-- remove the bucket itself, do it manually in Dashboard → Storage.

-- ── Core tables ──────────────────────────────────────────────

create table regions (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  code text not null unique,          -- 'SA' | 'ZM'
  slug text not null unique,          -- 'south-africa' | 'zambia' (used in URLs)
  created_at timestamptz default now()
);

create table targets (
  id uuid primary key default uuid_generate_v4(),
  region_id uuid not null references regions(id) on delete cascade,
  horizon text not null check (horizon in ('60', '90-120')),
  customers integer not null,
  licenses integer not null,
  revenue_target numeric not null,
  created_at timestamptz default now(),
  unique (region_id, horizon)
);

-- Engagement is the core, single-lifecycle record. The 60-day / 90-120-day
-- "tables" in the GTM Plan are views/filters over this one table (by
-- horizon), never separate records.
create table engagements (
  id uuid primary key default uuid_generate_v4(),
  region_id uuid not null references regions(id) on delete restrict,
  target_id uuid not null references targets(id) on delete restrict,
  customer_name text not null,
  contact_name text,
  designation text,
  objective text,
  horizon text not null check (horizon in ('60', '90-120')),
  source text not null check (source in ('New Prospect', 'Carried Over', 'Backfill')),
  -- 7 values: the GTM Plan's 6-stage progression plus 'Stalled', which the
  -- Backfill workflow (GTM Plan Slide 12) requires to mark a 60-day
  -- engagement as replaced without deleting its row.
  status text not null default 'Not Started' check (status in (
    'Not Started', 'Contacted', 'Meeting Booked', 'Requirement Confirmed',
    'Proposal Sent', 'Landed', 'Stalled'
  )),
  owner text,
  license_count integer not null default 1,
  next_action_date date,
  -- Which stalled engagement this row backfills, when source = 'Backfill'.
  -- Enforced at the app layer, not a DB constraint.
  backfill_of_id uuid references engagements(id) on delete set null,
  locked_at timestamptz,
  -- Reserved, unused until the Phase 2 Pipeline module exists.
  pipeline_deal_id uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Append-only activity log. This is the ONLY way an engagement's status
-- changes — see sync_engagement_status() below. Never updated or deleted.
create table actions (
  id uuid primary key default uuid_generate_v4(),
  engagement_id uuid not null references engagements(id) on delete cascade,
  type text not null check (type in ('call', 'meeting', 'email', 'note')),
  description text not null,
  -- Set when this entry advances the engagement to a new status.
  status_to text check (status_to in (
    'Not Started', 'Contacted', 'Meeting Booked', 'Requirement Confirmed',
    'Proposal Sent', 'Landed', 'Stalled'
  )),
  next_action_date date,
  occurred_at timestamptz not null default now(),
  created_by text,
  created_at timestamptz default now()
);

-- One row per uploaded file. Never deleted, only superseded by a new row.
create table artifacts (
  id uuid primary key default uuid_generate_v4(),
  engagement_id uuid not null references engagements(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  artifact_type text not null check (artifact_type in (
    'Readiness Review', 'Proposal', 'Meeting Notes', 'Signed Agreement', 'Other'
  )),
  uploaded_by text,
  uploaded_at timestamptz default now()
);

-- ── Status derivation trigger ────────────────────────────────
-- status is never edited as a bare field — it's derived from the latest
-- actions.status_to. SECURITY DEFINER so this update bypasses the
-- engagements RLS policy below (which blocks direct client edits once
-- locked_at is set) — this is the one path allowed to set locked_at itself.

create or replace function sync_engagement_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status_to is not null then
    update engagements
    set
      status = new.status_to,
      next_action_date = case
        when new.status_to = 'Landed' then null
        else coalesce(new.next_action_date, engagements.next_action_date)
      end,
      locked_at = case
        when new.status_to = 'Landed' then now()
        else locked_at
      end,
      updated_at = now()
    where id = new.engagement_id;
  elsif new.next_action_date is not null then
    update engagements
    set next_action_date = new.next_action_date, updated_at = now()
    where id = new.engagement_id;
  end if;
  return new;
end;
$$;

create trigger trg_sync_engagement_status
  after insert on actions
  for each row
  execute function sync_engagement_status();

-- ── Row Level Security ──────────────────────────────────────
-- Single-owner tool, same posture as before: any signed-in user can read
-- everything. Writes to engagements/actions/artifacts are additionally
-- gated on the parent engagement being unlocked (locked_at is null).

alter table regions enable row level security;
alter table targets enable row level security;
alter table engagements enable row level security;
alter table actions enable row level security;
alter table artifacts enable row level security;

create policy "auth read regions" on regions for select using (auth.role() = 'authenticated');
create policy "auth read targets" on targets for select using (auth.role() = 'authenticated');

create policy "auth read engagements" on engagements for select using (auth.role() = 'authenticated');
create policy "auth insert engagements" on engagements for insert with check (auth.role() = 'authenticated');
create policy "auth update open engagements" on engagements for update using (auth.role() = 'authenticated' and locked_at is null);
create policy "auth delete open engagements" on engagements for delete using (auth.role() = 'authenticated' and locked_at is null);

create policy "auth read actions" on actions for select using (auth.role() = 'authenticated');
create policy "auth insert actions on open engagements" on actions for insert with check (
  auth.role() = 'authenticated'
  and exists (select 1 from engagements e where e.id = engagement_id and e.locked_at is null)
);

create policy "auth read artifacts" on artifacts for select using (auth.role() = 'authenticated');
create policy "auth insert artifacts on open engagements" on artifacts for insert with check (
  auth.role() = 'authenticated'
  and exists (select 1 from engagements e where e.id = engagement_id and e.locked_at is null)
);

-- ── Seed regions & targets from the GTM Plan's 12-month numbers ─────
-- No engagement rows are seeded — those are created as real prospects come
-- in via the Region Workspace.

insert into regions (name, code, slug) values
  ('South Africa', 'SA', 'south-africa'),
  ('Zambia', 'ZM', 'zambia');

insert into targets (region_id, horizon, customers, licenses, revenue_target)
select id, '60', 2, 2, 180000 from regions where code = 'SA'
union all
select id, '90-120', 4, 4, 180000 from regions where code = 'SA'
union all
select id, '60', 2, 2, 180000 from regions where code = 'ZM'
union all
select id, '90-120', 4, 4, 180000 from regions where code = 'ZM';

-- ── Storage ──────────────────────────────────────────────────
-- Reuses the existing `artifacts` bucket and its policies from the old
-- schema (untouched by this script). Files are now keyed by
-- `${engagement_id}/...` instead of `${project_id}/...` — no migration of
-- existing files is included; the old `evidence` bucket has been dropped.

insert into storage.buckets (id, name, public)
values ('artifacts', 'artifacts', false)
on conflict (id) do nothing;

-- Re-declared with identical semantics to the old schema — this does not
-- touch or delete any existing files in the bucket.
drop policy if exists "auth read artifact files" on storage.objects;
drop policy if exists "auth write artifact files" on storage.objects;
drop policy if exists "auth delete artifact files" on storage.objects;

create policy "auth read artifact files" on storage.objects for select using (bucket_id = 'artifacts' and auth.role() = 'authenticated');
create policy "auth write artifact files" on storage.objects for insert with check (bucket_id = 'artifacts' and auth.role() = 'authenticated');
