# Real roster import & student profiles

**Date:** 2026-08-08  
**Status:** Approved for planning  
**Approach:** Profiles + assignment rates (no student portal yet)

## Goal

Replace demo teachers/students with the real Monday.com/export spreadsheet (`real students/Students_1785399730.xlsx`). Enrich the data model for status, pay, and credentials. Give admins search/filter/edit on student profiles; teachers see only their assigned students. No student-facing login UI in this pass.

## Decisions (locked)

| Topic | Choice |
|-------|--------|
| Student portal | None for now — profiles only |
| Teacher pay | Default hourly on teacher + optional per-student override |
| Import scope | Everyone (~238), all statuses |
| Demo data | Wipe teachers/students/classes; keep admin |
| Credentials | Stored so admin can view/copy on profiles; regenerate password |

## Status model

Spreadsheet → app enum `student_status`:

| Spreadsheet | App |
|-------------|-----|
| Student | `active` |
| On a pause | `paused` |
| ATX | `atx` |
| Ex Student | `ex` |
| Refunded | `refunded` |

Admin filters: All / Active / Paused / ATX / Ex / Refunded, plus text search (name, username, teacher name).

Junk rows (repeated headers, empty name) are skipped on import.

## Schema changes

### `profiles` (teachers / admin)

- Add `username` TEXT UNIQUE (nullable for existing admin until set)
- Keep `salary_per_hour` as **default** teacher hourly rate
- Keep `email` for Auth (synthetic for teachers: `{username}@linguigo.local`)
- Store admin-visible teacher password in `initial_password` TEXT (nullable) for copy/regenerate UX

### `students`

Extend beyond `full_name`, `email`, `notes`:

| Column | Type | Notes |
|--------|------|-------|
| `status` | `student_status` NOT NULL DEFAULT `active` | |
| `teacher_id` | UUID NULL → `profiles(id)` | Primary assigned teacher |
| `duration_minutes` | INT NULL | 27 / 40 / 55 from sheet |
| `price_paid` | NUMERIC(10,2) NULL | What student pays |
| `teacher_hourly_override` | NUMERIC(10,2) NULL | If set, used instead of teacher default |
| `classes_per_week` | NUMERIC(4,1) NULL | Allows 1.5 |
| `agent_commission` | TEXT NULL | Free text from sheet (e.g. `4$ (May)`) |
| `alert` | TEXT NULL | e.g. `2 classes left`, `OVERDUE` |
| `username` | TEXT UNIQUE NOT NULL | |
| `password` | TEXT NOT NULL | Plaintext for admin display only |
| `email` | TEXT NULL | Optional contact; not used for login |
| `notes` | TEXT NULL | |

Effective teacher pay for a student = `COALESCE(teacher_hourly_override, profiles.salary_per_hour)`.

### Auth / roles

- `user_role` stays `admin | teacher` (no student Auth accounts in this pass).
- Teachers authenticate via **username** on the login form; server resolves username → synthetic email → `signInWithPassword`.
- Admin continues with `admin@linguigo.com` / current password (email still accepted when input contains `@`).

## Credential rules

Format: `normalized.parts.XXX` where `XXX` is three random digits.

- Normalize: lowercase, strip parentheses nicknames into optional second token, non-letters → removed/split on spaces.
- Examples: `Jenny` → `jenny.482`; `Dorotea (Dora)` teacher → `dorotea.dora.173` or `dorotea.391`; `Maggie and Marian Yang` → `maggie.marian.yang.204`.
- Password: same pattern with a **different** random 3-digit suffix. If resulting password &lt; 6 characters, pad with extra digits to satisfy Supabase min length for teacher Auth passwords. Student passwords have no Auth hash requirement but should still be ≥ 6 chars for consistency.
- Uniqueness: retry random suffix on collision.
- Admin can regenerate password (and optionally username) from student/teacher profile.

## Import script

`scripts/import-real-roster.mjs`:

1. Read xlsx (header row with Name, Status, Teacher, Duration, Price, Teacher's hourly, Classes per week, Agent's Commission, Alert).
2. Delete (service role): non-admin `profiles` + matching `auth.users`; all `students`; cascading classes / events / reschedule requests as needed.
3. Build unique teacher set from sheet; for each:
   - Compute default hourly = mode of that teacher's rates (ignore `/` and empty).
   - Create Auth user + profile with username/password/salary.
4. Insert each student row with mapped fields and generated credentials.
5. Log summary: counts by status, teacher count, skipped rows.

Source file path: `real students/Students_1785399730.xlsx` (keep out of sensitive commit if needed; script references it locally).

## UI

### Admin Students (`/admin/students`)

- Search + status filter chips.
- Table columns: Name, Status, Teacher, Duration, Price, Classes/week, Alert, Actions.
- Profile page `/admin/students/[studentId]`: edit all roster fields; show username/password with copy; regenerate password; link to teacher.

### Admin Teachers

- Show username on list/profile.
- Profile: default hourly, credentials copy/regenerate, assigned student count.
- Existing schedule editor unchanged in behavior.

### Teacher “My Students”

- List/profile of students where `teacher_id = auth.uid()`.
- Visible: name, status, duration, alert, classes/week (and schedule context if already available).
- Hidden: password, agent commission, price/pay fields (or read-only price if useful for teaching — default **hide pay/commission/credentials**).

### Login form

- Label “Username or email”.
- If no `@`, resolve `profiles.username` → email for Auth.

## Permissions (RLS)

- Admin: full access to students including credentials.
- Teacher: `SELECT` (and no update of pay/credentials) on students with `teacher_id = auth.uid()`. Prefer a view or column-level exposure so `password` is not selected for teachers (UI must not fetch it; RLS alone cannot hide columns — use a restricted select list / RPC or separate `student_credentials` table readable only by admin).

**Preferred security split:** keep `password` on `students` but only admin server actions/pages select it; teacher queries omit the column.

## Out of scope

- Student-facing portal or Auth accounts for students
- Modeling affiliates as first-class users
- Auto-creating class schedule rows from the spreadsheet
- Changing class outcome / pay-stats logic beyond using default + override where already applicable

## Implementation order (high level)

1. Migration: status enum + student columns + profile username/initial_password
2. Types, auth username login, RLS updates
3. Admin students list/profile UI (search, filters, edit, credentials)
4. Teacher My Students UI
5. Teacher profile username/credentials display
6. Import script + run against Supabase
7. Verify admin/teacher flows and wipe of demo data

## Success criteria

- Demo roster gone; real teachers and students present with statuses and rates.
- Admin can search/filter students and change status/assignment/rates.
- Admin can copy student and teacher credentials from profiles.
- Teachers log in with username and only see their students (no passwords).
- No student login routes or UI.
