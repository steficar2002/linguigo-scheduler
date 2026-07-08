import { createClient } from "@/lib/supabase/server";
import { TeachersPanel } from "@/components/admin/teachers-panel";
import type { TeacherWithPendingCount } from "@/lib/types/database";

export default async function TeachersPage() {
  const supabase = await createClient();
  const [{ data: teachers }, { data: pendingRequests }] = await Promise.all([
    supabase
      .from("profiles")
      .select("*")
      .eq("role", "teacher")
      .order("full_name"),
    supabase
      .from("reschedule_requests")
      .select("teacher_id")
      .eq("status", "pending"),
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

  return <TeachersPanel teachers={teachersWithCounts} />;
}
