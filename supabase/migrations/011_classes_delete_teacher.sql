DROP POLICY IF EXISTS classes_delete_teacher ON public.classes;
CREATE POLICY classes_delete_teacher ON public.classes
  FOR DELETE TO authenticated
  USING (private.is_teacher() AND teacher_id = auth.uid());
