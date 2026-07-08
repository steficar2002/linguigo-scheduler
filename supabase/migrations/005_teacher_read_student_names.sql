-- Teachers can read students and course types linked to their classes

CREATE POLICY students_select_teacher ON public.students
  FOR SELECT TO authenticated
  USING (
    private.is_teacher()
    AND EXISTS (
      SELECT 1 FROM public.classes
      WHERE classes.student_id = students.id
        AND classes.teacher_id = auth.uid()
    )
  );

CREATE POLICY course_types_select_teacher ON public.course_types
  FOR SELECT TO authenticated
  USING (
    private.is_teacher()
    AND EXISTS (
      SELECT 1 FROM public.classes
      WHERE classes.course_type_id = course_types.id
        AND classes.teacher_id = auth.uid()
    )
  );
