# PQC Engagement Tracker

A private, login-gated CRM-style dashboard for the **PQC Consulting**
business line — engagements (customers), an append-only activity log,
region targets, and per-engagement artifacts. It follows the venture's
Go-To-Market Plan: South Africa and Zambia, 60-day and 90-120-day target
horizons, and a defined status/source pipeline vocabulary.

This is a **standalone app with its own Supabase project** — it holds only
PQC Consulting data. It doesn't share a login, database, or file storage
with the Wines dashboard, so PQC partners never see Wines data and vice
versa.

Stack: **Next.js** (frontend, on Vercel) + **Supabase** (auth, database, file
storage). Both have free tiers, and everything runs in accounts only you
control — no Anthropic or third-party infrastructure involved.

These instructions are written for **Windows 11**, using **PowerShell**
(the terminal built into Windows 11 and into VS Code). No bash required
anywhere in this setup.

---

## 0. Prerequisites (one-time)

1. **Node.js** — download the LTS installer from https://nodejs.org and run
   it (defaults are fine). This also installs `npm`. Verify it worked by
   opening **PowerShell** (search for it in the Start menu) and running:
   ```powershell
   node -v
   npm -v
   ```
   Both should print a version number.
2. **Git** — download from https://git-scm.com/download/win and install
   with the defaults. Verify:
   ```powershell
   git --version
   ```
3. **A code editor** (optional but recommended) — https://code.visualstudio.com.
   VS Code has an integrated PowerShell terminal, so you can do everything
   below without leaving it.

## 1. Create your Supabase project

1. Go to https://supabase.com → sign up (free) → **New project**
2. Pick a name (e.g. `pqc-engagement-tracker`), a database password (save
   it somewhere safe), and a region close to you (e.g. `eu-central` or
   `af-south-1` if offered)
3. Wait ~2 minutes for it to provision

## 2. Create the database tables

1. In your Supabase project, open **SQL Editor** → **New query**
2. Open `supabase/schema.sql` from this project, paste the whole thing in,
   and click **Run**
3. This creates `regions`, `targets`, `engagements`, `actions` and
   `artifacts`, sets row-level security (including the lock-on-Landed
   rules), creates the status-derivation trigger, seeds the `regions` and
   `targets` rows from the GTM Plan's 12-month numbers, and reuses the
   existing `artifacts` storage bucket.

   **If you're re-running this on the project that had the old
   Stakeholders/Commercials/Timeframes app**, this script drops that old
   schema and the `evidence` storage bucket first — it's a full replace,
   not an incremental migration. Export anything worth keeping from the
   old tables before running it.

## 3. Lock down sign-ups (important — do this before deploying)

By default, anyone who finds your login page could create an account. Since
this is just for you and your partners:

1. In Supabase, go to **Authentication → Sign In / Providers**
2. Turn off **"Allow new users to sign up"** *after* everyone who needs an
   account has created one — or add allowed emails to an allow-list if
   you'd rather not lose the option

## 4. Connect the app to your Supabase project

1. In Supabase: **Project Settings → API**
2. Copy the **Project URL** and the **anon public** key
3. In PowerShell, from inside this folder, make a copy of the example env
   file:
   ```powershell
   Copy-Item .env.local.example .env.local
   ```
4. Open `.env.local` in a text editor and paste your values in:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

## 5. Run it locally and create your account

In PowerShell, from inside this folder:

```powershell
npm install
npm run dev
```

Open http://localhost:3000 → you'll land on the login page → click
**"Need an account? Create one"** → sign up with your own email and a
password. Supabase will email you a confirmation link (check spam) — click
it, then sign in. You should land on the **Overview Dashboard**, showing
your seeded region targets and zero engagements. Now go back and do step 3
(turn off public sign-ups).

## 6. Deploy (Vercel)

This app already deploys to the `kvantium-crypto` Vercel project — push to
`main` and Vercel picks it up. If you're setting up fresh:

1. In the Vercel project's **Settings → Environment Variables**, add the
   same two variables from your `.env.local`
2. Deploy — you'll get your `https://kvantium-crypto.vercel.app` URL

---

## How the data is organised

- **regions** — South Africa and Zambia, seeded once.
- **targets** — one row per region × horizon (60-day / 90-120-day):
  customer count, license count, and revenue target. Read-only seed data
  from the GTM Plan — the app never writes to this table.
- **engagements** — the core CRM record, one row per customer, from first
  contact through Landed. Never re-created between horizons; the 60-Day /
  90-120-Day / All tabs on a Region Workspace are filters over this same
  table.
- **actions** — the append-only activity log (calls, meetings, emails,
  notes). This is the *only* way an engagement's status changes — the app
  never edits `engagements.status` directly, it inserts an action with
  `status_to` set and a database trigger derives the new status.
- **artifacts** — files (proposals, readiness reviews, signed agreements,
  meeting notes, other) attached to one engagement each, stored in the
  private `artifacts` Supabase Storage bucket and only ever accessed
  through short-lived signed links generated while you're signed in.
  Artifacts are never deleted — a new version is a new row.

When an engagement's status is set to **Landed**, it locks: `locked_at` is
set, and further edits to its header, activity log, and artifacts are
blocked both in the UI and at the database (RLS) level. A banner explains
that revenue/delivery tracking continues in the separate invoicing
forecast, which is intentionally outside this app.

## What's deliberately not in this app (Phase 2)

Per the Build Brief: a Pipeline/deal-tracking module, revenue forecasting,
and a monthly invoicing schedule all live outside this app. The only
groundwork laid now is a reserved, unused `pipeline_deal_id` column on
`engagements` and a disabled "Pipeline Link" tab on the engagement
drill-down — so adding that module later doesn't require a schema
migration.

## Extending it later

- **New field on Engagement**: add the column in `supabase/schema.sql`
  (with a `check` constraint if it's an enum), add it to `src/lib/types.ts`,
  then thread it through `NewEngagementForm.tsx` / `EngagementDrillDown.tsx`
  as needed.
- **New status or source value**: update the `check` constraint in
  `supabase/schema.sql` on both `engagements.status`/`source` and
  `actions.status_to`, then the matching array in `src/lib/types.ts`
  (`STATUSES` / `SOURCES`) — both must stay in sync.
- **Phase 2 (Pipeline)**: see `CLAUDE.md` for what's reserved vs. what
  still needs building.

## A note on ownership

This code and all your data live entirely in your own Supabase and
Vercel/GitHub accounts — nothing is hosted on or tied to Anthropic
infrastructure. Keep the GitHub repo private, and it's worth a quick check
of your employment contract for any IP-assignment clause that might reach
outside your role, though a personal ops tool for these ventures sits well
outside cryptography/digital identity consulting work.
