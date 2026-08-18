UPDATE public.classes SET outcome = 'canceled_on_time' WHERE outcome = 'missed';

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS classes_remaining INTEGER NOT NULL DEFAULT 0;

DROP POLICY IF EXISTS classes_select_teacher ON public.classes;
CREATE POLICY classes_select_teacher ON public.classes
  FOR SELECT TO authenticated
  USING (private.is_teacher() AND teacher_id = auth.uid());

DROP POLICY IF EXISTS classes_insert_teacher ON public.classes;
CREATE POLICY classes_insert_teacher ON public.classes
  FOR INSERT TO authenticated
  WITH CHECK (private.is_teacher() AND teacher_id = auth.uid());

DROP POLICY IF EXISTS classes_update_teacher ON public.classes;
CREATE POLICY classes_update_teacher ON public.classes
  FOR UPDATE TO authenticated
  USING (private.is_teacher() AND teacher_id = auth.uid())
  WITH CHECK (private.is_teacher() AND teacher_id = auth.uid());

DROP POLICY IF EXISTS course_types_select_teacher ON public.course_types;
CREATE POLICY course_types_select_teacher ON public.course_types
  FOR SELECT TO authenticated
  USING (private.is_teacher());

DROP POLICY IF EXISTS students_select_teacher_all ON public.students;
CREATE POLICY students_select_teacher_all ON public.students
  FOR SELECT TO authenticated
  USING (private.is_teacher());

INSERT INTO public.students (full_name, username, password, status, classes_remaining, notes)
SELECT 'Group class', 'group.class', 'group.class', 'active', 0, 'Virtual student for group classes'
WHERE NOT EXISTS (
  SELECT 1 FROM public.students WHERE lower(full_name) = 'group class'
);
