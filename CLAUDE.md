@AGENTS.md

# PQC Consulting Dashboard — project context

Read this before making changes. It's the standing context for this repo;
you don't need to ask about the basics covered here.

## What this is

A private, single-business dashboard for the **PQC Consulting** venture: a
Post-Quantum Cryptography consulting business with three partners. This
app tracks that business's client stakeholders, engagement planning,
commercials (profit sharing and input costs), timeframes, actions, and
stored evidence/artifacts (proposals, decks, contracts, etc.).

This is one of two sibling apps (the other is Wines, a completely separate
business with different partners). They share the same code structure by
design, but **have no connection to each other** — separate Supabase
projects, separate logins, separate deployments. Never assume data,
users, or secrets from one apply to the other.

## Stack

- **Next.js 15** (App Router, TypeScript, Tailwind) — frontend, deployed on
  Vercel
- **Supabase** — Postgres database, Auth, and file Storage. This is the
  only backend; there is no separate API server.
- `@supabase/ssr` for server + browser Supabase clients
  (`src/lib/supabase/server.ts`, `src/lib/supabase/client.ts`)

## Architecture

- `src/middleware.ts` — gates every route except `/login`. No page or data
  is reachable while signed out. Don't weaken this without being asked
  explicitly.
- `src/app/login/page.tsx` — email/password sign-in and sign-up.
  `emailRedirectTo` is set explicitly to `window.location.origin` on
  sign-up so confirmation links work in both local dev and production —
  this depends on the Supabase project's **Redirect URLs** allow-list
  also containing both. If auth redirect issues come up, check both sides.
- `src/app/dashboard/page.tsx` — loads the single `projects` row and
  renders `ProjectTabs`.
- `src/app/dashboard/components/`
  - `ProjectTabs.tsx` — the six tabs: Stakeholders, Commercials,
    Timeframes, Actions, Evidence, Artifacts.
  - `SimpleTable.tsx` — generic CRUD table (used by Stakeholders,
    Commercials, Timeframes, Actions). Columns are config-driven; adding a
    field to one of these tabs is usually just a new column entry, not a
    new component.
  - `FileTable.tsx` — CRUD + Supabase Storage upload (used by Evidence,
    Artifacts). Files are private; the UI always opens them via
    short-lived signed URLs, never public links.
- `supabase/schema.sql` — the full schema, RLS policies, and the seed row
  for this business. This is the source of truth for the database — if you
  change a table, update this file too so a fresh Supabase project can be
  rebuilt from it.

## Data model

Every table except `projects` hangs off `project_id` (there's just one row
in `projects` for this app — kept for schema parity with the Wines app,
and in case a sub-project is ever needed later, e.g. tracking a distinct
client engagement as its own project).

- `commercials.category` is `profit_share` or `input_cost`
- `commercials.cost_type` (input_cost only) is `deemed`, `actual`, or
  `budgeted`
- `commercials.party` — which partner or client entity a line applies to
- `stakeholders` — here this generally means client-side stakeholders per
  engagement, in addition to the three partners
- `dashboard_layouts` — reserved, unused so far. It's there for a future
  configurable drag-and-drop dashboard layout (one JSON layout per user
  per project). Don't repurpose this table for something else.

## Security notes — read before touching auth or RLS

- RLS policy today is intentionally simple: any authenticated user can
  read/write everything (`auth.role() = 'authenticated'`). This is a
  single-owner tool. If the other partners ever get their own logins,
  this policy needs to become per-row/per-partner — flag this to the user
  rather than assuming current behavior is fine to keep as-is if that
  comes up.
- The Supabase `anon` key is the only key that belongs in this app's
  `.env.local` / Vercel environment variables. Never introduce the
  `service_role` key into this codebase — it bypasses RLS entirely.
- `.env.local` is gitignored. Never commit it, and never hardcode
  Supabase URLs/keys directly into source files.
- Ask before changing anything in `supabase/schema.sql` that affects RLS
  policies or the auth flow — these are exactly the kind of change to walk
  through rather than apply silently.
