import { addDays } from "date-fns";
import { attachMaterialUrls } from "@/lib/class-materials";
import { requireRole } from "@/lib/auth";
import { parseWeekParam } from "@/lib/schedule";
import { createClient } from "@/lib/supabase/server";
import { GlobalSchedulePanel } from "@/components/admin/global-schedule-panel";
import type { RescheduleRequest, ScheduleClass, TeacherWithPendingCount } from "@/lib/types/database";

type PageProps = {
  searchParams: Promise<{ week?: string }>;
};

export default async function TeachersPage({ searchParams }: PageProps) {
  await requireRole("admin");
  const { week } = await searchParams;
  const supabase = await createClient();

  const weekStart = parseWeekParam(week);
  const rangeStart = addDays(weekStart, -7);
  const rangeEnd = addDays(weekStart, 20);

  const [
    { data: teachers },
    { data: pendingRequests },
    { data: classes },
    { data: students },
    { data: courseTypes },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("*")
      .eq("role", "teacher")
      .order("full_name"),
    supabase
      .from("reschedule_requests")
      .select("*")
      .eq("status", "pending"),
    supabase
      .from("classes")
      .select(
        "*, student:students(full_name), course_type:course_types(name), teacher:profiles!classes_teacher_id_fkey(full_name)"
      )
      .gte("starts_at", rangeStart.toISOString())
      .lte("starts_at", rangeEnd.toISOString())
      .order("starts_at"),
    supabase.from("students").select("*").order("full_name"),
    supabase.from("course_types").select("*").order("name"),
  ]);

  const countByTeacher = new Map<string, number>();
  for (const request of pendingRequests ?? []) {
    countByTeacher.set(
      request.teacher_id,
      (countByTeacher.get(request.teacher_id) ?? 0) + 1
    );
  }

  const teachersWithCounts: TeacherWithPendingCount[] = (teachers ?? []).map(
    (teacher) => ({
      ...teacher,
      pending_request_count: countByTeacher.get(teacher.id) ?? 0,
    })
  );

  const { data: allClasses } = await supabase
    .from("classes")
    .select(
      "*, student:students(full_name), course_type:course_types(name), teacher:profiles!classes_teacher_id_fkey(full_name)"
    )
    .gte("starts_at", addDays(weekStart, -30).toISOString())
    .lte("starts_at", addDays(weekStart, 44).toISOString())
    .order("starts_at");

  const classesWithMaterials = await attachMaterialUrls(
    (allClasses ?? classes ?? []) as ScheduleClass[]
  );
  const visibleClasses = await attachMaterialUrls((classes ?? []) as ScheduleClass[]);

  return (
    <GlobalSchedulePanel
      teachers={teachersWithCounts}
      classes={visibleClasses}
      allClasses={classesWithMaterials}
      students={students ?? []}
      courseTypes={courseTypes ?? []}
      pendingRequests={(pendingRequests ?? []) as RescheduleRequest[]}
    />
  );
}
