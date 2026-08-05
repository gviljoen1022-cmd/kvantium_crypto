# PQC Consulting Dashboard

A private, login-gated dashboard for the PQC Consulting business line —
stakeholders, commercials, timeframes, actions, evidence, and stored
artifacts.

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
4. **Unzip the project** you downloaded — right-click `business-dashboard.zip`
   → **Extract All** → pick a folder, e.g. `C:\Users\<you>\business-dashboard`.
   Then open that `app` folder in VS Code, or `cd` into it in PowerShell:
   ```powershell
   cd C:\Users\<you>\business-dashboard\app
   ```
   Run every command below from inside this `app` folder.

## 1. Create your Supabase project

1. Go to https://supabase.com → sign up (free) → **New project**
2. Pick a name (e.g. `business-dashboard`), a database password (save it
   somewhere safe), and a region close to you (e.g. `eu-central` or
   `af-south-1` if offered)
3. Wait ~2 minutes for it to provision

## 2. Create the database tables

1. In your Supabase project, open **SQL Editor** → **New query**
2. Open `supabase/schema.sql` from this project, paste the whole thing in,
   and click **Run**
3. This creates all the tables, sets row-level security so only signed-in
   users can read/write, creates the `evidence` and `artifacts` storage
   buckets, and seeds this project (PQC Consulting)

## 3. Lock down sign-ups (important — do this before deploying)

By default, anyone who finds your login page could create an account. Since
this is just for you:

1. In Supabase, go to **Authentication → Sign In / Providers**
2. Turn off **"Allow new users to sign up"** *after* you've created your own
   account in step 5 below — or add your email to an allow-list if you'd
   rather not lose the option

## 4. Connect the app to your Supabase project

1. In Supabase: **Project Settings → API**
2. Copy the **Project URL** and the **anon public** key
3. In PowerShell, from inside the `app` folder, make a copy of the example
   env file:
   ```powershell
   Copy-Item .env.local.example .env.local
   ```
   (Or in File Explorer: copy `.env.local.example`, paste it, rename the
   copy to `.env.local`.)
4. Open `.env.local` in a text editor (Notepad or VS Code) and paste your
   values in:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

## 5. Run it locally and create your account

In PowerShell, from inside the `app` folder:

```powershell
npm install
npm run dev
```

Open http://localhost:3000 → you'll land on the login page → click
**"Need an account? Create one"** → sign up with your own email and a
password. Supabase will email you a confirmation link (check spam) — click
it, then sign in. You should land straight on the **PQC Consulting**
dashboard. Now go back and do step 3 (turn off public sign-ups).

## 6. Deploy for free (Vercel)

1. Create a new **private** repository on https://github.com (no README/
   .gitignore needed — this project already has one). Then, in PowerShell
   from inside the `app` folder:
   ```powershell
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo>.git
   git push -u origin main
   ```
2. Go to https://vercel.com → sign up with GitHub → **Add New Project** →
   import the repo
3. In the Vercel project's **Settings → Environment Variables**, add the
   same two variables from your `.env.local`
4. Deploy — you'll get a free `https://your-app.vercel.app` URL

---

## How the data is organised

This app holds a single business line, but every table still hangs off a
`project_id` (there's just one `projects` row). That's intentional — it
keeps this app on the exact same schema as your other business dashboard,
so you can copy improvements between them without rewriting anything, and
it leaves room for a sub-project later (e.g. splitting Wines into separate
import batches) without a schema change.

- **stakeholders** — name, role, organization, contact
- **commercials** — `category` is either `profit_share` or `input_cost`;
  for input costs, `cost_type` is `deemed`, `actual`, or `budgeted`, and
  `party` records which partner/entity it applies to
- **timeframes** — milestones with due dates and status
- **actions** — action items with an owner, due date, and status
- **evidence** / **artifacts** — file uploads (presentations, decks, etc.),
  stored in private Supabase Storage buckets and only ever accessed through
  short-lived signed links generated while you're signed in

## Extending it later

This is deliberately a plain, unbranded scaffold so it's easy to keep
building on:

- **New feature/table**: add a table in Supabase (SQL Editor), then a new
  tab in `src/app/dashboard/components/ProjectTabs.tsx` using
  the existing `SimpleTable` or `FileTable` components — most new fields
  need no new component at all, just a new column entry
- **Configurable, drag-and-drop dashboard**: the `dashboard_layouts` table
  is already in the schema for this — it stores a JSON layout per user, per
  project, ready for a widget system (e.g. `react-grid-layout`) to read
  from and write to when you're ready to build it
- **New business line**: this app is deliberately scoped to one business
  and one Supabase project, so a new business line means duplicating this
  whole folder (as you did to split Wines and PQC Consulting apart), giving
  it its own Supabase project, and updating the seed row in
  `supabase/schema.sql` — that keeps each business's partners walled off
  from the others' data

## A note on ownership

This code and all your data live entirely in your own Supabase and
Vercel/GitHub accounts — nothing is hosted on or tied to Anthropic
infrastructure. Keep the GitHub repo private, and it's worth a quick check
of your employment contract for any IP-assignment clause that might reach
outside your role, though a personal ops tool for these ventures sits well
outside cryptography/digital identity consulting work.
