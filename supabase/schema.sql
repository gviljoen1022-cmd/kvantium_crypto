-- Run this once in the Supabase SQL editor (Project > SQL Editor > New query)

create extension if not exists "uuid-ossp";

-- ── Core tables ──────────────────────────────────────────────

create table if not exists projects (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  status text default 'active',
  created_at timestamptz default now()
);

create table if not exists stakeholders (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete cascade,
  name text not null,
  role text,
  organization text,
  contact_info text,
  created_at timestamptz default now()
);

-- category: 'profit_share' | 'input_cost'
-- cost_type (input_cost only): 'deemed' | 'actual' | 'budgeted'
create table if not exists commercials (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete cascade,
  category text not null,
  label text not null,
  cost_type text,
  party text,
  amount numeric,
  currency text default 'ZMW',
  notes text,
  created_at timestamptz default now()
);

create table if not exists timeframes (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete cascade,
  title text not null,
  due_date date,
  status text default 'pending',
  notes text,
  created_at timestamptz default now()
);

create table if not exists actions (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete cascade,
  title text not null,
  owner text,
  due_date date,
  status text default 'open',
  notes text,
  created_at timestamptz default now()
);

create table if not exists evidence (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete cascade,
  title text not null,
  file_path text not null,
  created_at timestamptz default now()
);

create table if not exists artifacts (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete cascade,
  title text not null,
  type text,
  file_path text not null,
  created_at timestamptz default now()
);

-- Reserved for the future drag-and-drop configurable dashboard:
-- one row per (user, project), storing widget positions/settings as JSON.
-- Nothing in the app writes to this yet — it's just ready for when you build that feature.
create table if not exists dashboard_layouts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  layout jsonb not null default '[]',
  updated_at timestamptz default now(),
  unique (user_id, project_id)
);

-- ── Row Level Security ──────────────────────────────────────
-- This is a single-user tool, so the policy is simple: any signed-in
-- user (i.e. you) can read/write everything. Don't leave sign-ups open
-- publicly — see the README for how to lock that down.

alter table projects enable row level security;
alter table stakeholders enable row level security;
alter table commercials enable row level security;
alter table timeframes enable row level security;
alter table actions enable row level security;
alter table evidence enable row level security;
alter table artifacts enable row level security;
alter table dashboard_layouts enable row level security;

create policy "auth full access" on projects for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "auth full access" on stakeholders for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "auth full access" on commercials for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "auth full access" on timeframes for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "auth full access" on actions for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "auth full access" on evidence for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "auth full access" on artifacts for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "auth full access" on dashboard_layouts for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ── Seed your two business lines ────────────────────────────

insert into projects (name, description) values
('PQC Consulting', 'Post-Quantum Cryptography consulting business with three partners. Client engagement planning and tracking.');

-- ── Storage buckets for Evidence and Artifacts ──────────────
-- Private buckets — files are only reachable via short-lived signed URLs
-- that the app generates for you when you're signed in.

insert into storage.buckets (id, name, public)
values ('evidence', 'evidence', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('artifacts', 'artifacts', false)
on conflict (id) do nothing;

create policy "auth read evidence files" on storage.objects for select using (bucket_id = 'evidence' and auth.role() = 'authenticated');
create policy "auth write evidence files" on storage.objects for insert with check (bucket_id = 'evidence' and auth.role() = 'authenticated');
create policy "auth delete evidence files" on storage.objects for delete using (bucket_id = 'evidence' and auth.role() = 'authenticated');

create policy "auth read artifact files" on storage.objects for select using (bucket_id = 'artifacts' and auth.role() = 'authenticated');
create policy "auth write artifact files" on storage.objects for insert with check (bucket_id = 'artifacts' and auth.role() = 'authenticated');
create policy "auth delete artifact files" on storage.objects for delete using (bucket_id = 'artifacts' and auth.role() = 'authenticated');
