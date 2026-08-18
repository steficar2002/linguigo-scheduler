import { Suspense } from "react";
import { addDays } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { parseWeekParam } from "@/lib/schedule";
import { getTeacherStats } from "@/lib/teacher-stats";
import { TeacherSchedule } from "@/components/teacher/teacher-schedule";
import type { CourseType, ScheduleClass, ClassScheduleEventWithRelations, RescheduleRequest, Student } from "@/lib/types/database";

type PageProps = {
  searchParams: Promise<{ week?: string }>;
};

export default async function TeacherSchedulePage({ searchParams }: PageProps) {
  const profile = await getProfile();
  const userId = profile?.id;
  const { week } = await searchParams;
  const supabase = await createClient();

  const weekStart = parseWeekParam(week);
  const rangeStart = addDays(weekStart, -7);
  const rangeEnd = addDays(weekStart, 20);

  const [
    { data: upcomingClasses },
    { data: calendarClasses },
    { data: events },
    { data: pendingRequests },
    { data: students },
    { data: courseTypes },
  ] = await Promise.all([
    supabase
      .from("classes")
      .select(
        "*, student:students(full_name), course_type:course_types(name), teacher:profiles!classes_teacher_id_fkey(full_name)"
      )
      .eq("teacher_id", userId!)
      .gte("starts_at", new Date().toISOString())
      .order("starts_at"),
    supabase
      .from("classes")
      .select(
        "*, student:students(full_name), course_type:course_types(name), teacher:profiles!classes_teacher_id_fkey(full_name)"
      )
      .eq("teacher_id", userId!)
      .gte("starts_at", rangeStart.toISOString())
      .lte("starts_at", rangeEnd.toISOString())
      .order("starts_at"),
    supabase
      .from("class_schedule_events")
      .select(
        "*, student:students(full_name), course_type:course_types(name), changed_by_profile:profiles!class_schedule_events_changed_by_fkey(full_name)"
      )
      .eq("teacher_id", userId!)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("reschedule_requests")
      .select("*")
      .eq("teacher_id", userId!)
      .eq("status", "pending"),
    supabase.from("students").select("id, full_name").order("full_name"),
    supabase.from("course_types").select("id, name").order("name"),
  ]);

  const classesWithUrls: ScheduleClass[] = await Promise.all(
    (upcomingClasses ?? []).map(async (classItem) => {
      if (!classItem.material_path) {
        return { ...classItem, materialUrl: null };
      }
      const { data } = await supabase.storage
        .from("class-materials")
        .createSignedUrl(classItem.material_path, 3600);
      return { ...classItem, materialUrl: data?.signedUrl ?? null };
    })
  );

  const calendarWithUrls: ScheduleClass[] = await Promise.all(
    (calendarClasses ?? []).map(async (classItem) => {
      if (!classItem.material_path) {
        return { ...classItem, materialUrl: null };
      }
      const { data } = await supabase.storage
        .from("class-materials")
        .createSignedUrl(classItem.material_path, 3600);
      return { ...classItem, materialUrl: data?.signedUrl ?? null };
    })
  );

  const stats = await getTeacherStats(userId!, Number(profile?.salary_per_hour ?? 0));

  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-muted" />}>
      <TeacherSchedule
        classes={classesWithUrls}
        calendarClasses={calendarWithUrls}
        events={(events ?? []) as ClassScheduleEventWithRelations[]}
        pendingRequests={(pendingRequests ?? []) as RescheduleRequest[]}
        students={(students ?? []) as Student[]}
        courseTypes={(courseTypes ?? []) as CourseType[]}
        teacherId={userId!}
        stats={stats}
        salaryPerHour={Number(profile?.salary_per_hour ?? 0)}
      />
    </Suspense>
  );
}
