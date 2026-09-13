DROP POLICY IF EXISTS students_select_teacher_all ON public.students;

DROP POLICY IF EXISTS students_select_teacher_group ON public.students;
CREATE POLICY students_select_teacher_group ON public.students
  FOR SELECT TO authenticated
  USING (
    private.is_teacher()
    AND lower(full_name) = 'group class'
  );
