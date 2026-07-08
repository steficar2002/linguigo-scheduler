-- Teacher reschedule requests

CREATE TYPE public.reschedule_request_status AS ENUM ('pending', 'approved', 'denied');

CREATE TABLE public.reschedule_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status public.reschedule_request_status NOT NULL DEFAULT 'pending',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX reschedule_requests_one_pending_per_class
  ON public.reschedule_requests(class_id)
  WHERE status = 'pending';

CREATE INDEX reschedule_requests_teacher_status_idx
  ON public.reschedule_requests(teacher_id, status);

CREATE TRIGGER reschedule_requests_updated_at
  BEFORE UPDATE ON public.reschedule_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.reschedule_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY reschedule_requests_select_admin ON public.reschedule_requests
  FOR SELECT TO authenticated
  USING (private.is_admin());

CREATE POLICY reschedule_requests_select_teacher ON public.reschedule_requests
  FOR SELECT TO authenticated
  USING (
    private.is_teacher()
    AND teacher_id = auth.uid()
  );

CREATE POLICY reschedule_requests_insert_teacher ON public.reschedule_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    private.is_teacher()
    AND teacher_id = auth.uid()
  );

CREATE POLICY reschedule_requests_update_admin ON public.reschedule_requests
  FOR UPDATE TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());
