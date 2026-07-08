-- Linguigo Scheduler initial schema

CREATE SCHEMA IF NOT EXISTS private;

-- Enums
CREATE TYPE public.user_role AS ENUM ('admin', 'teacher');

-- Profiles (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  role public.user_role NOT NULL DEFAULT 'teacher',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX profiles_role_idx ON public.profiles(role);

-- Students
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Course types
CREATE TABLE public.course_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Scheduled classes
CREATE TABLE public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
  course_type_id UUID NOT NULL REFERENCES public.course_types(id) ON DELETE RESTRICT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  material_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT classes_ends_after_starts CHECK (ends_at > starts_at)
);

CREATE INDEX classes_teacher_starts_idx ON public.classes(teacher_id, starts_at);
CREATE INDEX classes_starts_idx ON public.classes(starts_at);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER students_updated_at
  BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER course_types_updated_at
  BEFORE UPDATE ON public.course_types
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER classes_updated_at
  BEFORE UPDATE ON public.classes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile on signup (role from app_metadata, default teacher)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  user_role public.user_role;
BEGIN
  IF NEW.raw_app_meta_data ? 'role' AND NEW.raw_app_meta_data->>'role' = 'admin' THEN
    user_role := 'admin'::public.user_role;
  ELSE
    user_role := 'teacher'::public.user_role;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    user_role
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS helper functions (private schema)
CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin' AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION private.is_teacher()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'teacher' AND is_active = true
  );
$$;

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY profiles_select ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR private.is_admin());

CREATE POLICY profiles_insert ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid() OR private.is_admin());

CREATE POLICY profiles_update ON public.profiles
  FOR UPDATE TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

CREATE POLICY profiles_delete ON public.profiles
  FOR DELETE TO authenticated
  USING (private.is_admin());

-- Students policies (admin only)
CREATE POLICY students_select ON public.students
  FOR SELECT TO authenticated
  USING (private.is_admin());

CREATE POLICY students_insert ON public.students
  FOR INSERT TO authenticated
  WITH CHECK (private.is_admin());

CREATE POLICY students_update ON public.students
  FOR UPDATE TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

CREATE POLICY students_delete ON public.students
  FOR DELETE TO authenticated
  USING (private.is_admin());

-- Course types policies (admin only)
CREATE POLICY course_types_select ON public.course_types
  FOR SELECT TO authenticated
  USING (private.is_admin());

CREATE POLICY course_types_insert ON public.course_types
  FOR INSERT TO authenticated
  WITH CHECK (private.is_admin());

CREATE POLICY course_types_update ON public.course_types
  FOR UPDATE TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

CREATE POLICY course_types_delete ON public.course_types
  FOR DELETE TO authenticated
  USING (private.is_admin());

-- Classes policies
CREATE POLICY classes_select_admin ON public.classes
  FOR SELECT TO authenticated
  USING (private.is_admin());

CREATE POLICY classes_select_teacher ON public.classes
  FOR SELECT TO authenticated
  USING (
    private.is_teacher()
    AND teacher_id = auth.uid()
    AND starts_at >= now() - interval '1 day'
  );

CREATE POLICY classes_insert ON public.classes
  FOR INSERT TO authenticated
  WITH CHECK (private.is_admin());

CREATE POLICY classes_update ON public.classes
  FOR UPDATE TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

CREATE POLICY classes_delete ON public.classes
  FOR DELETE TO authenticated
  USING (private.is_admin());

-- Storage bucket for class materials
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'class-materials',
  'class-materials',
  false,
  10485760,
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY class_materials_admin_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'class-materials'
    AND private.is_admin()
  );

CREATE POLICY class_materials_admin_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'class-materials'
    AND private.is_admin()
  );

CREATE POLICY class_materials_admin_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'class-materials'
    AND private.is_admin()
  )
  WITH CHECK (
    bucket_id = 'class-materials'
    AND private.is_admin()
  );

CREATE POLICY class_materials_admin_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'class-materials'
    AND private.is_admin()
  );

CREATE POLICY class_materials_teacher_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'class-materials'
    AND private.is_teacher()
    AND EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.material_path = storage.objects.name
        AND c.teacher_id = auth.uid()
    )
  );
