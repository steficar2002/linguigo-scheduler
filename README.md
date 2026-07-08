# Linguigo Scheduler

Internal Next.js tool for scheduling Linguigo classes. Admins manage teachers, students, course types, and class schedules with optional PDF materials. Teachers see a read-only view of their own upcoming classes.

## Stack

- Next.js (App Router)
- Supabase (Auth, Postgres, Storage, RLS)
- Netlify deployment

## Setup

### 1. Supabase

1. Create a Supabase project.
2. Link the project and apply migrations:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

Or run the SQL in [`supabase/migrations/001_initial_schema.sql`](supabase/migrations/001_initial_schema.sql) in the Supabase SQL editor.

### 2. Environment variables

Copy `.env.local.example` to `.env.local` and fill in:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server only — never expose to the browser)
- `NEXT_PUBLIC_SITE_URL` (e.g. `http://localhost:3000` or your Netlify URL)

### 3. Bootstrap the first admin

1. Enable email signup in Supabase Auth (or invite yourself).
2. Sign up / log in once through the app.
3. Promote your account in the Supabase SQL editor:

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'you@example.com';
```

### 4. Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Roles

| Role | Access |
|------|--------|
| Admin | Full CRUD on teachers, students, course types, and classes |
| Teacher | Read-only list/calendar of own upcoming classes + PDF links |

## Netlify deployment

1. Push this repo to GitHub.
2. Create a new site in Netlify and connect the repository.
3. Set the same environment variables in Netlify site settings.
4. Deploy — Netlify auto-detects Next.js via OpenNext.

## Project structure

```
src/app/(admin)/     Admin CRUD pages
src/app/(teacher)/   Teacher schedule
src/app/(auth)/      Login
src/lib/supabase/    Supabase clients
supabase/migrations/ Database schema + RLS
```
