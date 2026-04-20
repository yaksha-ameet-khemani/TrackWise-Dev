# Content Sharing Portal

A web application for tracking daily assessment and question sharing activity across clients and programs.

## Overview

The Content Sharing Portal allows teams to log, manage, and review shared assessments and questions. Entries are stored in Supabase and can be filtered, edited, replaced, and exported. Access is role-based — admins can manage users in addition to entries.

## Tech Stack

- **React 18** + **TypeScript**
- **Vite** — dev server and build tool
- **Tailwind CSS** — styling
- **Supabase** — database, authentication, and edge functions (`@supabase/supabase-js`)

## Features

- **Dashboard** — summary view of all active entries
- **Updated Dashboard** — alternate dashboard with milestone breakdown (Assignment / Assessment / Mock / Review) for each content type including Skill Assist
- **Log Entry** — add new entries or edit/replace existing ones
- **All Entries** — filterable, paginated table with edit, replace, and delete actions
- **Authentication** — email + password login; admin-only invite flow with email verification
- **User Management** — admin-only tab to invite, resend invites, revoke, and restore member access
- **Replacement tracking** — entries can be replaced with a reason; originals are preserved and linkable
- **Optimistic UI** — changes apply immediately and revert on failure

## Entry Fields

Each entry captures: date, client, program, track, skill, question shared, type (MFA / SF / MCQ / etc.), milestone, learning path, grading method, CSDM, autograding ETA, status, issues, course correction, and remarks.

**Clients:** Cognizant, KPMG, UST, IIHT, B2C, Infosys, Wipro, Other

**Statuses:** Under Review, Approved, Closed program, Pending, Rejected, Sent to CSDM

**Grading:** AutoGraded, Manual, AI-Autograded

---

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project with the required tables and auth configured
- Supabase CLI (for deploying Edge Functions)

### Environment Variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Install & Run

```bash
npm install
npm run dev
```

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

### Seed Database

```bash
npm run seed
```

---

## Project Structure

```
src/
  auth/               # AuthContext (session, profile, role, revoked state)
  components/
    admin/            # Admin-only components (UserManagement)
  data/               # Sample/seed data
  lib/                # Supabase client
  pages/              # LoginPage, AcceptInvitePage
  types/              # TypeScript types (Entry, Profile, etc.)
  utils/              # Storage, export, and database helpers
  constants.ts        # Shared constants (clients, skills, statuses, etc.)
  types.ts            # Core Entry, Tab, and Filters types
  App.tsx             # Root component — auth gates + state management

supabase/
  functions/
    invite-user/      # Edge Function — admin sends invite email
    manage-user/      # Edge Function — admin revokes or restores a user
  migrations/
    20260408000000_profiles.sql        # profiles table, RLS, new-user trigger
    20260408000001_profiles_status.sql # status, invited_at, last_sign_in_at columns
    20260408000002_profiles_revoke.sql # is_revoked, revoked_at columns + admin RLS policy
```

---

## Database Setup

### Tables

| Table | Purpose |
|-------|---------|
| `entries` | All content sharing entries |
| `profiles` | Linked to `auth.users` — stores name, role, status, invite metadata |

### profiles columns

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | FK → auth.users |
| `name` | text | Display name |
| `email` | text | Email address |
| `role` | text | `admin` or `member` |
| `status` | text | `pending` (invite not accepted) or `active` |
| `is_revoked` | boolean | Soft-delete flag — revoked users cannot log in |
| `invited_at` | timestamptz | When the invite was sent |
| `last_sign_in_at` | timestamptz | Updated on each sign-in via DB trigger |
| `revoked_at` | timestamptz | When the account was revoked |

### entries columns

| Column | Type | Description |
|--------|------|-------------|
| `id` | text | Primary key (UUID generated client-side) |
| `date` | text | Entry date |
| `client` | text | Client name |
| `program_name` | text | Program / project name |
| `track_name` | text | Track name |
| `skill` | text | Skill / assessment type |
| `question_shared` | text | Question or content shared |
| `type` | text | MFA / SF / MCQ / MFA-Manual / MFA + MCQ / SF + MCQ |
| `skill_assist` | text | Skill Assist used (Yes / No) |
| `milestone` | text | Mock / Actual / Re-attempt / Assignment / Assessment / Demo / Milestone |
| `learning_path` | text | Learning Path used (Yes / No) |
| `grading` | text | AutoGraded / Manual / AI-Autograded |
| `csdm` | text | Content Subject Domain Manager name |
| `autograding_eta` | text | Autograding ETA or status |
| `status` | text | Under Review / Approved / Closed program / Pending / Rejected / Sent to CSDM |
| `issues` | text | Issues highlighted |
| `course_correction` | text | Course correction notes |
| `remarks` | text | Additional remarks |
| `is_replaced` | boolean | Whether this entry has been replaced |
| `replaced_by_id` | text | ID of the replacement entry |
| `replacement_reason` | text | Reason for replacement |
| `replaces_id` | text | ID of the original entry this replaces |

### entries table SQL

The `entries` table has no migration file — run this manually in the **Supabase SQL Editor**:

```sql
create table if not exists public.entries (
  id                  text        primary key,
  date                text,
  client              text,
  program_name        text,
  track_name          text,
  skill               text,
  question_shared     text,
  type                text,
  skill_assist        text,
  milestone           text,
  learning_path       text,
  grading             text,
  csdm                text,
  autograding_eta     text,
  status              text,
  issues              text,
  course_correction   text,
  remarks             text,
  is_replaced         boolean     not null default false,
  replaced_by_id      text,
  replacement_reason  text,
  replaces_id         text,
  created_at          timestamptz not null default now()
);

-- Enable RLS
alter table public.entries enable row level security;

-- Allow all authenticated users to read and write entries
create policy "entries_all_authenticated"
  on public.entries for all
  to authenticated
  using (true)
  with check (true);
```

---

## Edge Functions

Two Supabase Edge Functions handle privileged admin operations (both require the service role key, which never touches the browser).

### invite-user

Sends an invite email to a new member via Supabase Auth admin API and creates their profile row.

**Deploy:**
```bash
npx supabase functions deploy invite-user --project-ref <project-ref> --no-verify-jwt
```

### manage-user

Revokes or restores a user — bans/unbans them in Supabase Auth and updates `profiles.is_revoked`.

**Deploy:**
```bash
npx supabase functions deploy manage-user --project-ref <project-ref> --no-verify-jwt
```

---

## Authentication Flow

### Login
Standard email + password via `supabase.auth.signInWithPassword()`.

### Invite (admin → new member)
1. Admin fills in name + email in the **Users** tab
2. App calls the `invite-user` Edge Function
3. Supabase sends an invite email with a 24-hour link
4. Member clicks the link → lands on **Set Password** page
5. Member sets their password → account becomes active

### Invite link expiry
Invite links expire after **24 hours**. If expired, the member sees a clear message and the admin can resend the invite from the Users tab.

### Revoke / Restore
- Admin clicks **Revoke** on any member row → user is immediately banned in Supabase Auth (signed out) and marked `is_revoked = true`
- Admin clicks **Restore** → user is unbanned and can log in again
- Admins cannot revoke other admins or themselves

---

## Roles

| Role | Capabilities |
|------|-------------|
| Member | View dashboards, log entries, edit, replace, export |
| Admin | All member capabilities + Users tab (invite, resend, revoke, restore) |

---

## First Admin Setup

1. Go to **Supabase Dashboard → Authentication → Users → Invite user** and enter your email.
2. Accept the invite and set your password via the app.
3. Run this in the **Supabase SQL Editor** to promote yourself to admin:

```sql
UPDATE public.profiles SET role = 'admin' WHERE email = 'your@email.com';
```

All subsequent users are invited through the app UI by the admin.

---

## Setting Up a New Supabase Project

Follow these steps in order when deploying to a fresh Supabase project (e.g. moving from UAT to production).

### 1. Configure Auth URL

Go to **Supabase Dashboard → Authentication → URL Configuration** and set:

- **Site URL** — your deployed app URL (e.g. `https://your-app.vercel.app`)
- **Redirect URLs** — add the same URL

This is required for invite emails to link to the correct app. If testing locally, set it to `http://localhost:5173` (Vite's default port).

### 2. Run the profiles migrations

In **Supabase Dashboard → SQL Editor**, run these files in order:

1. `supabase/migrations/20260408000000_profiles.sql`
2. `supabase/migrations/20260408000001_profiles_status.sql`
3. `supabase/migrations/20260408000002_profiles_revoke.sql`

### 3. Create the entries table

Run the entries table SQL from the [entries table SQL](#entries-table-sql) section above in the SQL Editor.

### 4. Deploy Edge Functions

Replace `<project-ref>` with your Supabase project reference ID (found in the dashboard URL):

```bash
npx supabase functions deploy invite-user --project-ref <project-ref> --no-verify-jwt
npx supabase functions deploy manage-user --project-ref <project-ref> --no-verify-jwt
```

### 5. Update environment variables

Update your `.env` (or hosting platform's environment settings) with the new project's credentials from **Supabase Dashboard → Project Settings → API**:

```env
VITE_SUPABASE_URL=https://<new-project-id>.supabase.co
VITE_SUPABASE_ANON_KEY=<new-anon-key>
```

### 6. Create the first admin

Follow the [First Admin Setup](#first-admin-setup) steps above.

### 7. (Optional) Migrate data from the old project

To bring existing entries data across:

1. In the old project — **Table Editor → entries → Export to CSV**
2. In the new project — **Table Editor → entries → Import from CSV**

Alternatively, if your data is in `src/data/`, point `.env` at the new project and run:

```bash
npm run seed
```
