export type UserRole = "admin" | "teacher";

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Student = {
  id: string;
  full_name: string;
  email: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type CourseType = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type Class = {
  id: string;
  teacher_id: string;
  student_id: string;
  course_type_id: string;
  starts_at: string;
  ends_at: string;
  material_path: string | null;
  created_at: string;
  updated_at: string;
};

export type ClassWithRelations = Class & {
  student: Pick<Student, "full_name"> | null;
  course_type: Pick<CourseType, "name"> | null;
  teacher: Pick<Profile, "full_name"> | null;
};
