import { addDays } from "date-fns";
import { notFound } from "next/navigation";
import { attachMaterialUrls } from "@/lib/class-materials";
import { requireRole } from "@/lib/auth";
import { parseWeekParam } from "@/lib/schedule";
import { getTeacherStats } from "@/lib/teacher-stats";
import { getSignedUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { TeacherProfileEditor } from "@/components/admin/teacher-profile-editor";
import type { RescheduleRequest, ScheduleClass } from "@/lib/types/database";

type PageProps = {
  params: Promise<{ teacherId: string }>;
  searchParams: Promise<{ week?: string }>;
};

export default async function TeacherProfilePage({
  params,
  searchParams,
}: PageProps) {
  await requireRole("admin");
  const { teacherId } = await params;
  const { week } = await searchParams;
  const supabase = await createClient();

  const weekStart = parseWeekParam(week);
  const rangeStart = addDays(weekStart, -7);
  const rangeEnd = addDays(weekStart, 20);

  const [
    { data: teacher },
    { data: classes },
    { data: students },
    { data: courseTypes },
    { data: events },
    { data: pendingRequests },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("*")
      .eq("id", teacherId)
      .eq("role", "teacher")
      .single(),
    supabase
      .from("classes")
      .select(
        "*, student:students(full_name), course_type:course_types(name), teacher:profiles!classes_teacher_id_fkey(full_name)"
      )
      .eq("teacher_id", teacherId)
      .gte("starts_at", rangeStart.toISOString())
      .lte("starts_at", rangeEnd.toISOString())
      .order("starts_at"),
    supabase.from("students").select("*").order("full_name"),
    supabase.from("course_types").select("*").order("name"),
    supabase
      .from("class_schedule_events")
      .select(
        "*, student:students(full_name), course_type:course_types(name), changed_by_profile:profiles!class_schedule_events_changed_by_fkey(full_name)"
      )
      .eq("teacher_id", teacherId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("reschedule_requests")
      .select("*")
      .eq("teacher_id", teacherId)
      .eq("status", "pending"),
  ]);

  if (!teacher) notFound();

  const { data: allClasses } = await supabase
    .from("classes")
    .select(
      "*, student:students(full_name), course_type:course_types(name), teacher:profiles!classes_teacher_id_fkey(full_name)"
    )
    .eq("teacher_id", teacherId)
    .gte("starts_at", addDays(weekStart, -30).toISOString())
    .lte("starts_at", addDays(weekStart, 44).toISOString())
    .order("starts_at");

  const avatarUrl = teacher.avatar_path
    ? await getSignedUrl("profile-photos", teacher.avatar_path)
    : null;

  const stats = await getTeacherStats(teacherId, Number(teacher.salary_per_hour));
  const classesWithMaterials = await attachMaterialUrls(
    (allClasses ?? classes ?? []) as ScheduleClass[]
  );

  return (
    <TeacherProfileEditor
      teacher={teacher}
      avatarUrl={avatarUrl}
      stats={stats}
      classes={classesWithMaterials}
      students={students ?? []}
      courseTypes={courseTypes ?? []}
      events={events ?? []}
      pendingRequests={(pendingRequests ?? []) as RescheduleRequest[]}
    />
  );
}
