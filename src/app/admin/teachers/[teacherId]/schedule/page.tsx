import { notFound } from "next/navigation";
import { addDays } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { parseWeekParam } from "@/lib/schedule";
import { TeacherScheduleEditor } from "@/components/admin/teacher-schedule-editor";
import type { ScheduleClass, RescheduleRequest } from "@/lib/types/database";

type PageProps = {
  params: Promise<{ teacherId: string }>;
  searchParams: Promise<{ week?: string }>;
};

export default async function TeacherSchedulePage({
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

  // Widen fetch for overlap checks beyond visible window
  const { data: allClasses } = await supabase
    .from("classes")
    .select(
      "*, student:students(full_name), course_type:course_types(name), teacher:profiles!classes_teacher_id_fkey(full_name)"
    )
    .eq("teacher_id", teacherId)
    .gte("starts_at", addDays(weekStart, -30).toISOString())
    .lte("starts_at", addDays(weekStart, 44).toISOString())
    .order("starts_at");

  return (
    <TeacherScheduleEditor
      teacher={teacher}
      classes={(allClasses ?? classes ?? []) as ScheduleClass[]}
      students={students ?? []}
      courseTypes={courseTypes ?? []}
      events={events ?? []}
      pendingRequests={(pendingRequests ?? []) as RescheduleRequest[]}
    />
  );
}
