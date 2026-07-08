-- Store teacher's requested new class time

ALTER TABLE public.reschedule_requests
  ADD COLUMN requested_starts_at TIMESTAMPTZ,
  ADD COLUMN requested_ends_at TIMESTAMPTZ;
