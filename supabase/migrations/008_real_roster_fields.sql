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
