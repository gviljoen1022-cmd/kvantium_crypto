@AGENTS.md

# PQC Engagement Tracker — project context

Read this before making changes. It's the standing context for this repo;
you don't need to ask about the basics covered here.

## What this is

A private, login-gated CRM-style engagement tracker for the **PQC
Consulting** venture: a Post-Quantum Cryptography consulting business with
three partners. It replaced a plain tabbed-CRUD scaffold in 2026-08 — this
app is now built around the venture's Go-To-Market Plan (South Africa and
Zambia, 60-day and 90-120-day horizons, quantified targets, and a defined
status/source pipeline vocabulary), not a generic project dashboard.

Two decks define this app's shape and are the source of truth for scope
questions: `GTM_Plan_Cryptographic_Transformation.pptx` (the business plan)
and `PQC_Engagement_Tracker_Build_Brief.pptx` (the CRM build spec — data
model, screens, field rules, acceptance criteria). If a requirement is
unclear, check those before guessing.

This is one of three sibling apps in the Kvantium Convergence workspace
(the others are Wines and the public landing site) — see the workspace
root `CLAUDE.md`. They share code structure by convention but have **no
connection to each other** — separate Supabase projects, separate logins,
separate deployments.

## Stack

- **Next.js** (App Router, TypeScript, Tailwind) — frontend, deployed on
  Vercel (`kvantium-crypto` project)
- **Supabase** — Postgres database, Auth, and file Storage. This is the
  only backend; there is no separate API server.
- `@supabase/ssr` for server + browser Supabase clients
  (`src/lib/supabase/server.ts`, `src/lib/supabase/client.ts`)

## Architecture

- `src/middleware.ts` — gates every route except `/login`. Unchanged from
  before the rebuild. Don't weaken this without being asked explicitly.
- `src/app/login/page.tsx` — email/password sign-in and sign-up.
  `emailRedirectTo` is set explicitly to `${window.location.origin}/auth/callback`
  on sign-up so confirmation links work in both local dev and production —
  this depends on the Supabase project's **Redirect URLs** allow-list also
  containing both origins.
- `src/app/auth/callback/route.ts` — completes the Supabase email
  confirmation (and any other PKCE code-exchange) flow: reads `?code=`,
  calls `exchangeCodeForSession`, then redirects to `/dashboard` (or
  `?next=`). This route didn't exist before 2026-08-17 despite
  `middleware.ts` already whitelisting `/auth/*` as public — confirmation
  emails sent fine via Brevo but the link had nowhere to land, so
  verification silently failed.
- `src/lib/types.ts` — shared TypeScript types and enums (`Status`,
  `Source`, `Horizon`, `ActionType`, `ArtifactType`) mirrored from
  `supabase/schema.sql`'s check constraints. Keep these two in sync.
- `src/app/dashboard/page.tsx` — **Overview Dashboard**, the landing page
  after login. Server component; read-only; every stat and row links
  through to the Region Workspace or an Engagement.
- `src/app/dashboard/region/[slug]/page.tsx` — **Region Workspace**
  (`south-africa` / `zambia`). Tabs (60-Day / 90-120 Day / All) filter the
  same `engagements` table by `horizon` — never separate records.
- `src/app/dashboard/engagement/[id]/page.tsx` — **Engagement Drill-Down**,
  the full record for one customer: header + Activity Log / Artifacts /
  Notes / Pipeline Link tabs.
- `src/app/dashboard/components/`
  - `RegionWorkspace.tsx`, `EngagementTable.tsx`, `NewEngagementForm.tsx`,
    `StatusUpdateControl.tsx` — Region Workspace screen.
  - `EngagementDrillDown.tsx`, `ActivityLog.tsx` (shared by the Activity
    Log and Notes tabs via a `fixedType` prop), `ArtifactsTab.tsx`,
    `PipelineLinkTab.tsx` — Engagement Drill-Down screen.
  - `StatusBadge.tsx` — shared status → color mapping.
- `supabase/schema.sql` — the full schema, RLS policies, trigger, and seed
  rows. This is the source of truth for the database — if you change a
  table, update this file too so a fresh Supabase project can be rebuilt
  from it. **I don't run this against the live Supabase project myself —
  you run it manually in the SQL Editor, same as the original setup flow.**

## Data model — three CRM principles that resolve most ambiguity

From the Build Brief (Slide 3) — apply these before inventing a new pattern:

1. **One record, full lifecycle.** An engagement is a single row from first
   contact through Landed, never re-created between horizons. The 60-day /
   90-120-day tabs are filtered views over `engagements`, not separate
   tables.
2. **Nothing is overwritten.** Status/action/note changes append to the
   `actions` activity log rather than replacing a field. `engagements.status`
   is *derived*, never written directly by the app — see below.
3. **Dashboards summarise, records explain.** The Overview screen shows
   totals only; every number must click through to the engagements behind
   it.

### Tables

- `regions` — South Africa / Zambia. `code` (SA/ZM) and `slug`
  (south-africa/zambia, used in routes — an addition beyond the brief's
  literal field list, needed for the URL pattern).
- `targets` — one row per (region, horizon): `customers`, `licenses`,
  `revenue_target`. Read-only seed data from the GTM Plan's 12-month
  numbers; the app never writes to this table.
- `engagements` (core) — customer/contact/designation/objective, `horizon`,
  `source` (`New Prospect` / `Carried Over` / `Backfill`), `status`,
  `owner`, `license_count`, `next_action_date`, `backfill_of_id` (which
  stalled engagement a Backfill row replaces — app-enforced, not a DB
  constraint), `locked_at`, `pipeline_deal_id` (reserved, unused — Phase 2
  stub, see below).
- `actions` — append-only activity log: `type` (call/meeting/email/note),
  `description`, optional `status_to`, optional `next_action_date`.
  Insert-only; no update/delete policy exists.
- `artifacts` — one row per uploaded file, keyed by `engagement_id`.
  Insert/select only — **never delete a row here**; a superseding upload
  is a new row, per the brief ("never overwrite, only supersede").

### Status is derived, not edited

`engagements.status` has **7 values**: the Build Brief's 6-stage
progression (Not Started → Contacted → Meeting Booked → Requirement
Confirmed → Proposal Sent → Landed) plus `Stalled`. `Stalled` isn't in the
Build Brief's own "authoritative" status table, but the GTM Plan's Backfill
workflow requires it (marking a 60-day customer as stalled so a
replacement can be added) — this was a deliberate resolution of a
contradiction between the two source decks, confirmed with the user during
the 2026-08 rebuild.

The **only** way `status` changes is via the `sync_engagement_status()`
trigger (`SECURITY DEFINER`, fires `AFTER INSERT ON actions` when
`status_to` is set). It also sets `locked_at = now()` and clears
`next_action_date` when the new status is `Landed`. Never add app code that
does `update engagements set status = ...` directly — always insert into
`actions` with `status_to` set instead.

### Lock-on-Landed

`locked_at` mirrors the Wines process-tracker's `closed_at` pattern
(`wines-dashboard/supabase/schema_process_tracker.sql`): a nullable
timestamp, enforced server-side via RLS (`using (locked_at is null)` on
`engagements` update/delete, and on `actions`/`artifacts` insert via an
`exists (...)` check against the parent engagement) — not just a UI
disable. The `sync_engagement_status()` trigger is `SECURITY DEFINER`
specifically so it can set `locked_at` itself despite that same RLS rule
blocking direct client writes.

### Phase 2 — reserved, not built

`pipeline_deal_id` (nullable uuid on `engagements`) and the disabled
"Pipeline Link" tab are the only Phase 2 groundwork in this build. Do not
create a `pipeline_deal_id` table, a pipeline board, or a functional link
action unless explicitly asked to start Phase 2 — see the Build Brief
Slide 11 and 13 for exactly what's in and out of scope.

## Security notes — read before touching auth or RLS

- RLS is intentionally simple: any authenticated user can read everything,
  and can write to `engagements`/`actions`/`artifacts` subject to the
  lock rules above. This is a single-owner tool. If the other partners
  ever get their own logins, this policy needs to become per-row/per-
  partner — flag this to the user rather than assuming current behavior
  is fine to keep as-is if that comes up.
- The Supabase `anon` key is the only key that belongs in this app's
  `.env.local` / Vercel environment variables. Never introduce the
  `service_role` key into this codebase — it bypasses RLS entirely.
- `.env.local` is gitignored. Never commit it, and never hardcode
  Supabase URLs/keys directly into source files.
- Ask before changing anything in `supabase/schema.sql` that affects RLS
  policies, the lock/derivation trigger, or the auth flow — these are
  exactly the kind of change to walk through rather than apply silently.
