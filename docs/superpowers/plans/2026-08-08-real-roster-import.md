# Real Roster Import & Student Profiles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace demo roster with real spreadsheet teachers/students, add status/search/profiles/credentials for admin, username login for teachers, and teacher-only views of assigned students.

**Architecture:** Extend `students` and `profiles` via migration; synthetic-email username auth for teachers; admin student list/profile UI with filters; teacher My Students (no credentials); one-shot Node import script wipes demo data and loads the xlsx.

**Tech Stack:** Next.js App Router, Supabase Auth + Postgres RLS, TypeScript, Zod, xlsx (script), existing shadcn/ui panels.

## Global Constraints

- Follow design: `docs/superpowers/specs/2026-08-08-real-roster-import-design.md`
- No student Auth accounts or student portal routes
- Teacher pay = `COALESCE(student.teacher_hourly_override, profile.salary_per_hour)`
- Credentials plaintext on student/teacher profiles for admin copy only; teachers must never fetch `password`
- Login accepts username (no `@`) or email (contains `@`)
- Wipe all non-admin profiles/students/classes on import; keep `admin@linguigo.com`
- Password length ≥ 6 (Supabase floor for teacher Auth)
- Do not commit `.env.local`; xlsx may stay untracked or local-only
- Verify with `npm run build` after UI/auth tasks; no Jest in repo — use small Node asserts for pure helpers

## File map

| File | Responsibility |
|------|----------------|
| `supabase/migrations/008_real_roster_fields.sql` | Enum + student columns + profile username/initial_password + RLS |
| `src/lib/types/database.ts` | TypeScript types |
| `src/lib/credentials.ts` | Username/password generation + normalize |
| `src/lib/student-status.ts` | Status labels + spreadsheet mapping |
| `src/lib/auth-username.ts` | Resolve login identifier → Auth email |
| `src/app/(auth)/login/actions.ts` | Username-aware login |
| `src/app/(auth)/login/login-form.tsx` | Username or email field |
| `src/app/admin/students/actions.ts` | CRUD + regenerate password + status updates |
| `src/app/admin/students/page.tsx` | List with search/filter query params |
| `src/app/admin/students/[studentId]/page.tsx` | Student profile page |
| `src/components/admin/students-panel.tsx` | Search/filter table UI |
| `src/components/admin/student-profile-editor.tsx` | Profile edit + credentials |
| `src/app/admin/teachers/actions.ts` | Regenerate teacher credentials; create with username |
| `src/components/admin/teacher-profile-editor.tsx` | Show username/password |
| `src/components/admin/teachers-panel.tsx` | Show username column |
| `src/app/teacher/students/page.tsx` | Teacher My Students list |
| `src/app/teacher/students/[studentId]/page.tsx` | Teacher-safe student profile |
| `src/components/teacher/teacher-nav.tsx` | Link to My Students |
| `src/components/teacher/my-students-panel.tsx` | Teacher list UI |
| `scripts/import-real-roster.mjs` | Wipe + import from xlsx |
| `scripts/lib/roster-parse.mjs` | Shared parse/normalize helpers for script (optional inline in import) |

---

### Task 1: Database migration

**Files:**
- Create: `supabase/migrations/008_real_roster_fields.sql`
- Apply via Supabase MCP `apply_migration` (project `hhtdflbaaguncyulsiqd`)

**Interfaces:**
- Produces: `student_status` enum; new columns on `students` and `profiles`; teacher SELECT policy for assigned students

- [ ] **Step 1: Write migration SQL**

```sql
CREATE TYPE public.student_status AS ENUM (
  'active', 'paused', 'atx', 'ex', 'refunded'
);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS initial_password TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique
  ON public.profiles (username)
  WHERE username IS NOT NULL;

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS status public.student_status NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS duration_minutes INT,
  ADD COLUMN IF NOT EXISTS price_paid NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS teacher_hourly_override NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS classes_per_week NUMERIC(4,1),
  ADD COLUMN IF NOT EXISTS agent_commission TEXT,
  ADD COLUMN IF NOT EXISTS alert TEXT,
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS password TEXT;

-- Backfill usernames/passwords for any existing students before NOT NULL
UPDATE public.students
SET
  username = COALESCE(username, 'student.' || substr(replace(id::text, '-', ''), 1, 8)),
  password = COALESCE(password, 'temp.' || substr(replace(id::text, '-', ''), 1, 6))
WHERE username IS NULL OR password IS NULL;

ALTER TABLE public.students
  ALTER COLUMN username SET NOT NULL,
  ALTER COLUMN password SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS students_username_unique
  ON public.students (username);

CREATE INDEX IF NOT EXISTS students_status_idx ON public.students (status);
CREATE INDEX IF NOT EXISTS students_teacher_id_idx ON public.students (teacher_id);

-- Teachers can read their assigned students (existing students_select is admin-only;
-- keep admin policy; add teacher policy). Do NOT rely on RLS to hide password —
-- app queries must omit password for teachers.
DROP POLICY IF EXISTS students_select_teacher_assigned ON public.students;
CREATE POLICY students_select_teacher_assigned ON public.students
  FOR SELECT TO authenticated
  USING (
    private.is_teacher()
    AND teacher_id = auth.uid()
  );
```

- [ ] **Step 2: Apply migration** via MCP `apply_migration` name `real_roster_fields` with the SQL above. Expected: success.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/008_real_roster_fields.sql
git commit -m "Add migration for roster fields, status, and usernames."
```

---

### Task 2: Types + credential helpers

**Files:**
- Modify: `src/lib/types/database.ts`
- Create: `src/lib/credentials.ts`
- Create: `src/lib/student-status.ts`

**Interfaces:**
- Produces: `StudentStatus`, updated `Student`/`Profile`; `generateCredentials(fullName)`, `normalizeNameParts(fullName)`, `mapSpreadsheetStatus(raw)`, `STUDENT_STATUS_LABELS`

- [ ] **Step 1: Update types in `database.ts`**

```ts
export type StudentStatus = "active" | "paused" | "atx" | "ex" | "refunded";

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  avatar_path: string | null;
  salary_per_hour: number;
  username: string | null;
  initial_password: string | null;
  created_at: string;
  updated_at: string;
};

export type Student = {
  id: string;
  full_name: string;
  email: string | null;
  notes: string | null;
  status: StudentStatus;
  teacher_id: string | null;
  duration_minutes: number | null;
  price_paid: number | null;
  teacher_hourly_override: number | null;
  classes_per_week: number | null;
  agent_commission: string | null;
  alert: string | null;
  username: string;
  password: string;
  created_at: string;
  updated_at: string;
};

export type StudentWithTeacher = Student & {
  teacher: Pick<Profile, "id" | "full_name" | "username"> | null;
};
```

- [ ] **Step 2: Create `src/lib/student-status.ts`**

```ts
import type { StudentStatus } from "@/lib/types/database";

export const STUDENT_STATUS_LABELS: Record<StudentStatus, string> = {
  active: "Active",
  paused: "Paused",
  atx: "ATX",
  ex: "Ex student",
  refunded: "Refunded",
};

export function mapSpreadsheetStatus(raw: string | null | undefined): StudentStatus | null {
  const s = (raw ?? "").trim().toLowerCase();
  if (!s || s === "status") return null;
  if (s === "student") return "active";
  if (s === "on a pause") return "paused";
  if (s === "atx") return "atx";
  if (s === "ex student") return "ex";
  if (s === "refunded") return "refunded";
  return null;
}
```

- [ ] **Step 3: Create `src/lib/credentials.ts`**

```ts
const AUTH_EMAIL_DOMAIN = "linguigo.local";

export function authEmailFromUsername(username: string) {
  return `${username}@${AUTH_EMAIL_DOMAIN}`;
}

export function normalizeNameParts(fullName: string): string[] {
  const cleaned = fullName
    .toLowerCase()
    .replace(/[()]/g, " ")
    .replace(/[^a-z0-9\s.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.split(/[\s.]+/).filter(Boolean);
}

function randomDigits(n: number) {
  let out = "";
  for (let i = 0; i < n; i++) out += Math.floor(Math.random() * 10).toString();
  return out;
}

export function buildUsernameBase(fullName: string) {
  const parts = normalizeNameParts(fullName);
  if (parts.length === 0) return "user";
  return parts.join(".");
}

/** username + password, both ≥ 6 chars, different suffixes */
export function generateCredentials(fullName: string) {
  const base = buildUsernameBase(fullName);
  let username = `${base}.${randomDigits(3)}`;
  if (username.length < 6) username = `${username}${randomDigits(6 - username.length)}`;

  let password = `${base}.${randomDigits(3)}`;
  while (password === username) {
    password = `${base}.${randomDigits(3)}`;
  }
  if (password.length < 6) password = `${password}${randomDigits(6 - password.length)}`;

  return { username, password };
}

export function parseMoney(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const m = String(raw).replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
}

export function parseDurationMinutes(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const m = String(raw).match(/(\d+)\s*min/i);
  return m ? Number(m[1]) : null;
}
```

- [ ] **Step 4: Smoke-test helpers**

Run:

```bash
cd "/Users/stefe/Linguigo scheduler" && npx --yes tsx -e "
import { generateCredentials, parseMoney, parseDurationMinutes } from './src/lib/credentials.ts';
import { mapSpreadsheetStatus } from './src/lib/student-status.ts';
const c = generateCredentials('Dorotea (Dora)');
console.log(c);
console.assert(c.username.length >= 6 && c.password.length >= 6);
console.assert(c.username !== c.password);
console.assert(mapSpreadsheetStatus('On a pause') === 'paused');
console.assert(parseMoney('35\$') === 35);
console.assert(parseDurationMinutes('55 min') === 55);
console.log('ok');
"
```

Expected: prints credentials and `ok`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/types/database.ts src/lib/credentials.ts src/lib/student-status.ts
git commit -m "Add roster types and credential/status helpers."
```

---

### Task 3: Username login

**Files:**
- Create: `src/lib/auth-username.ts`
- Modify: `src/app/(auth)/login/actions.ts`
- Modify: `src/app/(auth)/login/login-form.tsx`

**Interfaces:**
- Consumes: `authEmailFromUsername`
- Produces: `resolveAuthEmail(identifier: string): Promise<string | null>`

- [ ] **Step 1: Create `src/lib/auth-username.ts`**

```ts
import { createAdminClient } from "@/lib/supabase/admin";
import { authEmailFromUsername } from "@/lib/credentials";

export async function resolveAuthEmail(identifier: string): Promise<string | null> {
  const value = identifier.trim();
  if (!value) return null;
  if (value.includes("@")) return value.toLowerCase();

  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("email, username")
    .eq("username", value.toLowerCase())
    .maybeSingle();

  if (data?.email) return data.email;
  // Fallback if profile email missing but convention used
  return authEmailFromUsername(value.toLowerCase());
}
```

- [ ] **Step 2: Update `loginAction`** to read `identifier` (or keep form name `email` but treat as identifier):

```ts
export async function loginAction(formData: FormData) {
  const identifier = String(formData.get("email") ?? formData.get("identifier") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!identifier || !password) {
    return { error: "Username/email and password are required." };
  }

  const { resolveAuthEmail } = await import("@/lib/auth-username");
  const email = await resolveAuthEmail(identifier);
  if (!email) return { error: "Account not found." };

  const supabase = await createClient();
  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  // ... existing redirect by role
}
```

- [ ] **Step 3: Update login form label** to “Username or email”; keep `name="email"` for minimal churn or rename to `identifier` and match action.

- [ ] **Step 4: `npm run build`** — Expected: success.

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth-username.ts src/app/\(auth\)/login/actions.ts src/app/\(auth\)/login/login-form.tsx
git commit -m "Support username login for teachers."
```

---

### Task 4: Admin student actions + list UI

**Files:**
- Modify: `src/app/admin/students/actions.ts`
- Modify: `src/app/admin/students/page.tsx`
- Modify: `src/components/admin/students-panel.tsx`

**Interfaces:**
- Produces: `createStudentAction`, `updateStudentAction`, `deleteStudentAction`, `regenerateStudentPasswordAction`, `updateStudentStatusAction`

- [ ] **Step 1: Expand Zod schema and actions** to accept status, teacher_id, duration_minutes, price_paid, teacher_hourly_override, classes_per_week, agent_commission, alert, notes, email. On create, call `generateCredentials(full_name)` and insert username/password.

- [ ] **Step 2: `regenerateStudentPasswordAction(studentId)`** — generate new password only (keep username), update row, revalidate `/admin/students` and profile path.

- [ ] **Step 3: Update page** to accept `searchParams: { q?: string; status?: string }`, query students with `teacher:profiles!students_teacher_id_fkey(id, full_name, username)`, filter in SQL:
  - if status in enum → `.eq("status", status)`
  - if q → `.or(\`full_name.ilike.%${q}%,username.ilike.%${q}%\`)` (and optionally filter by teacher name client-side if join filter is awkward)

- [ ] **Step 4: Rebuild `students-panel.tsx`** with search input, status filter chips (All + each status), table columns Name / Status / Teacher / Duration / Price / Classes/week / Alert / Actions (Profile link to `/admin/students/[id]`, Edit dialog optional if profile covers it).

- [ ] **Step 5: `npm run build`** — Expected: success.

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/students/actions.ts src/app/admin/students/page.tsx src/components/admin/students-panel.tsx
git commit -m "Add admin student search, filters, and roster fields."
```

---

### Task 5: Admin student profile page

**Files:**
- Create: `src/app/admin/students/[studentId]/page.tsx`
- Create: `src/components/admin/student-profile-editor.tsx`

**Interfaces:**
- Consumes: update/regenerate actions from Task 4
- Produces: editable profile with credentials copy UI

- [ ] **Step 1: Server page** loads student by id + teachers list for select; `notFound()` if missing.

- [ ] **Step 2: Client editor** form fields for all roster columns; status select; teacher select; credentials block showing username/password with copy buttons + Regenerate password calling `regenerateStudentPasswordAction`.

- [ ] **Step 3: Manual check in browser after import (Task 8): open a student, change status, copy password.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/students/[studentId]/page.tsx src/components/admin/student-profile-editor.tsx
git commit -m "Add admin student profile editor with credentials."
```

---

### Task 6: Teacher My Students

**Files:**
- Modify: `src/components/teacher/teacher-nav.tsx`
- Create: `src/app/teacher/students/page.tsx`
- Create: `src/app/teacher/students/[studentId]/page.tsx`
- Create: `src/components/teacher/my-students-panel.tsx`
- Ensure middleware allows `/teacher/students` (same `/teacher` prefix — should already work)

**Interfaces:**
- Teacher queries **must omit** `password`, `agent_commission`, `price_paid`, `teacher_hourly_override` (and `initial_password` N/A)

- [ ] **Step 1: Add nav link** “My Students” → `/teacher/students`.

- [ ] **Step 2: List page** `requireRole("teacher")`, select:

```ts
.select("id, full_name, status, duration_minutes, classes_per_week, alert, teacher_id")
.eq("teacher_id", userId)
.order("full_name")
```

- [ ] **Step 3: Detail page** same safe columns + notes if useful; read-only UI.

- [ ] **Step 4: `npm run build`**.

- [ ] **Step 5: Commit**

```bash
git add src/components/teacher/teacher-nav.tsx src/app/teacher/students src/components/teacher/my-students-panel.tsx
git commit -m "Add teacher My Students views without credentials."
```

---

### Task 7: Teacher username on admin create/profile

**Files:**
- Modify: `src/app/admin/teachers/actions.ts`
- Modify: `src/components/admin/teacher-profile-editor.tsx`
- Modify: `src/components/admin/teachers-panel.tsx` (optional username column)

**Interfaces:**
- On create teacher: generate credentials; create Auth user with `email: authEmailFromUsername(username)`, password, `email_confirm: true`; set profile username + initial_password + salary.
- Prefer `createUser` over invite-only so username/password work immediately (update invite flow accordingly).

- [ ] **Step 1: Change `createTeacherAction`** to use admin `createUser` with generated username/password and synthetic email; upsert profile fields.

- [ ] **Step 2: Add `regenerateTeacherPasswordAction`**.

- [ ] **Step 3: Show username + initial_password on teacher profile editor** (admin only) with copy + regenerate.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/teachers/actions.ts src/components/admin/teacher-profile-editor.tsx src/components/admin/teachers-panel.tsx
git commit -m "Issue teacher usernames and show credentials on profile."
```

---

### Task 8: Import script + run

**Files:**
- Create: `scripts/import-real-roster.mjs`
- Optionally add `xlsx` as a `devDependency` in `package.json`

**Interfaces:**
- Consumes: same credential/status rules as helpers (duplicate minimal JS in script to avoid TS compile, or run via `tsx` importing `src/lib/*`)

- [ ] **Step 1: Implement script** that:
  1. Loads `.env.local`
  2. Parses `real students/Students_1785399730.xlsx` sheet `students`, data from header row where col0 === `Name`
  3. Skips empty names / `Name` / `Students` / `Status` header repeats
  4. Lists auth users; deletes all except admin email `admin@linguigo.com` (auth.admin.deleteUser + profiles cascade)
  5. Deletes all students (and related classes via CASCADE if FK set — otherwise delete classes/events/requests first)
  6. Groups teachers; mode hourly rate; createUser + profile
  7. Inserts students with mapped fields + credentials
  8. Prints summary counts

Preferred: use `npx tsx scripts/import-real-roster.ts` importing `generateCredentials`, `mapSpreadsheetStatus`, `parseMoney`, `parseDurationMinutes`, `authEmailFromUsername` from `src/lib/*`.

- [ ] **Step 2: Dry-run log** first 5 teachers + 5 students to console before writes (or `--dry-run` flag).

- [ ] **Step 3: Run import** against project (service role). Expected: ~20 teachers, ~230 students, status breakdown printed.

- [ ] **Step 4: Verify via SQL** (MCP `execute_sql`):

```sql
SELECT role, count(*) FROM profiles GROUP BY role;
SELECT status, count(*) FROM students GROUP BY status ORDER BY 1;
SELECT full_name, username, salary_per_hour FROM profiles WHERE role = 'teacher' ORDER BY full_name LIMIT 10;
```

- [ ] **Step 5: Commit script** (not credentials output)

```bash
git add scripts/import-real-roster.ts package.json package-lock.json
git commit -m "Add real roster import script from spreadsheet."
```

---

### Task 9: End-to-end verification

- [ ] **Step 1:** Admin login `admin@linguigo.com` / current password → Students: filters + search work.
- [ ] **Step 2:** Open student profile → credentials visible; change status to Paused; save.
- [ ] **Step 3:** Teacher login with imported username/password → My Students shows only their students; no password fields in network/UI.
- [ ] **Step 4:** `npm run build` clean.
- [ ] **Step 5:** Commit any fixups; push only if user requests.

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| Wipe demo / keep admin | 8 |
| Status enum + filters | 1, 2, 4 |
| Student fields + override rate | 1, 4, 5, 8 |
| Teacher default hourly | 7, 8 |
| Username login | 3, 7, 8 |
| Admin credentials on profiles | 5, 7 |
| Teacher My Students no secrets | 6 |
| Import xlsx | 8 |
| No student portal | (no task adds it) |

## Self-review notes

- No TBD placeholders; helpers duplicated only if script cannot import TS — prefer `tsx` + shared `src/lib`.
- Types in Task 2 match later UI field names.
- Password column never selected in Task 6 queries.
