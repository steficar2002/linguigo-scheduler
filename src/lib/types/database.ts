export type UserRole = "admin" | "teacher";

export type ClassOutcome = "scheduled" | "completed" | "missed";

export type StudentStatus = "active" | "paused" | "atx" | "ex" | "refunded";

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  avatar_path: string | null;
  salary_per_hour: number;
  username: string | null;
  initial_password: string | null;
  created_at: string;
  updated_at: string;
};

export type Student = {
  id: string;
  full_name: string;
  email: string | null;
  notes: string | null;
  status: StudentStatus;
  teacher_id: string | null;
  duration_minutes: number | null;
  price_paid: number | null;
  teacher_hourly_override: number | null;
  classes_per_week: number | null;
  agent_commission: string | null;
  alert: string | null;
  username: string;
  password: string;
  created_at: string;
  updated_at: string;
};

export type StudentWithTeacher = Student & {
  teacher: Pick<Profile, "id" | "full_name" | "username"> | null;
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
  outcome: ClassOutcome;
  created_at: string;
  updated_at: string;
};

export type ClassWithRelations = Class & {
  student: Pick<Student, "full_name"> | null;
  course_type: Pick<CourseType, "name"> | null;
  teacher: Pick<Profile, "full_name"> | null;
};

export type ScheduleEventType = "created" | "rescheduled" | "cancelled";

export type ClassScheduleEvent = {
  id: string;
  class_id: string | null;
  teacher_id: string;
  event_type: ScheduleEventType;
  student_id: string | null;
  course_type_id: string | null;
  old_starts_at: string | null;
  old_ends_at: string | null;
  new_starts_at: string | null;
  new_ends_at: string | null;
  changed_by: string;
  note: string | null;
  created_at: string;
};

export type ClassScheduleEventWithRelations = ClassScheduleEvent & {
  student: Pick<Student, "full_name"> | null;
  course_type: Pick<CourseType, "name"> | null;
  changed_by_profile: Pick<Profile, "full_name"> | null;
};

export type ScheduleClass = ClassWithRelations & {
  materialUrl?: string | null;
};

export type RescheduleRequestStatus = "pending" | "approved" | "denied";

export type RescheduleRequest = {
  id: string;
  class_id: string;
  teacher_id: string;
  status: RescheduleRequestStatus;
  requested_at: string;
  requested_starts_at: string | null;
  requested_ends_at: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
};

export type RescheduleRequestWithClass = RescheduleRequest & {
  class: ScheduleClass | null;
};

export type TeacherWithPendingCount = Profile & {
  pending_request_count: number;
};

export type TeacherStatsPeriod = {
  total: number;
  successful: number;
  missed: number;
  payment: number;
};

export type TeacherStats = {
  today: TeacherStatsPeriod;
  yesterday: TeacherStatsPeriod;
  pastWeek: TeacherStatsPeriod;
  pastMonth: TeacherStatsPeriod;
};
