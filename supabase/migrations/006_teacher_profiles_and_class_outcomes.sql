-- Teacher profiles, class outcomes, profile photos

CREATE TYPE public.class_outcome AS ENUM ('scheduled', 'completed', 'missed');

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_path TEXT,
  ADD COLUMN IF NOT EXISTS salary_per_class NUMERIC(10, 2) NOT NULL DEFAULT 0;

ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS outcome public.class_outcome NOT NULL DEFAULT 'scheduled';

CREATE INDEX IF NOT EXISTS classes_outcome_idx ON public.classes (outcome);
CREATE INDEX IF NOT EXISTS classes_teacher_outcome_idx ON public.classes (teacher_id, outcome);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-photos',
  'profile-photos',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY profile_photos_admin_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'profile-photos'
    AND private.is_admin()
  );

CREATE POLICY profile_photos_admin_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'profile-photos'
    AND private.is_admin()
  );

CREATE POLICY profile_photos_admin_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'profile-photos'
    AND private.is_admin()
  )
  WITH CHECK (
    bucket_id = 'profile-photos'
    AND private.is_admin()
  );

CREATE POLICY profile_photos_admin_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'profile-photos'
    AND private.is_admin()
  );

CREATE POLICY profile_photos_teacher_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'profile-photos'
    AND (
      private.is_admin()
      OR name LIKE auth.uid()::text || '/%'
    )
  );
