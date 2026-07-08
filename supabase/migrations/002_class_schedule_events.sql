-- Schedule event history for class changes

CREATE TYPE public.schedule_event_type AS ENUM ('created', 'rescheduled', 'cancelled');

CREATE TABLE public.class_schedule_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type public.schedule_event_type NOT NULL,
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  course_type_id UUID REFERENCES public.course_types(id) ON DELETE SET NULL,
  old_starts_at TIMESTAMPTZ,
  old_ends_at TIMESTAMPTZ,
  new_starts_at TIMESTAMPTZ,
  new_ends_at TIMESTAMPTZ,
  changed_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX class_schedule_events_teacher_created_idx
  ON public.class_schedule_events(teacher_id, created_at DESC);

CREATE INDEX class_schedule_events_class_idx
  ON public.class_schedule_events(class_id);

ALTER TABLE public.class_schedule_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY class_schedule_events_select_admin ON public.class_schedule_events
  FOR SELECT TO authenticated
  USING (private.is_admin());

CREATE POLICY class_schedule_events_select_teacher ON public.class_schedule_events
  FOR SELECT TO authenticated
  USING (
    private.is_teacher()
    AND teacher_id = auth.uid()
  );

CREATE POLICY class_schedule_events_insert_admin ON public.class_schedule_events
  FOR INSERT TO authenticated
  WITH CHECK (private.is_admin());
