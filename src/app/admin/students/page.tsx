import { createClient } from "@/lib/supabase/server";
import { StudentsPanel } from "@/components/admin/students-panel";
import type { StudentStatus, StudentWithTeacher } from "@/lib/types/database";

const studentStatuses = new Set<StudentStatus>([
  "active",
  "paused",
  "atx",
  "ex",
  "refunded",
]);

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q: rawQuery, status: rawStatus } = await searchParams;
  const q = rawQuery?.trim().replace(/[%,().\\]/g, "") ?? "";
  const status = studentStatuses.has(rawStatus as StudentStatus)
    ? (rawStatus as StudentStatus)
    : undefined;
  const supabase = await createClient();
  let query = supabase
    .from("students")
    .select(
      "id, full_name, status, duration_minutes, price_paid, classes_per_week, alert, teacher_id, email, notes, username, teacher:profiles!students_teacher_id_fkey(id, full_name, username)",
    )
    .order("full_name");

  if (status) {
    query = query.eq("status", status);
  }

  if (q) {
    const { data: matchingTeachers } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "teacher")
      .or(`full_name.ilike.%${q}%,username.ilike.%${q}%`);
    const teacherIds = (matchingTeachers ?? []).map((teacher) => teacher.id);
    const searchFilters = [
      `full_name.ilike.%${q}%`,
      `username.ilike.%${q}%`,
    ];

    if (teacherIds.length > 0) {
      searchFilters.push(`teacher_id.in.(${teacherIds.join(",")})`);
    }

    query = query.or(searchFilters.join(","));
  }

  const { data: students } = await query;

  return (
    <StudentsPanel
      students={(students ?? []) as unknown as StudentWithTeacher[]}
      q={q}
      status={status}
    />
  );
}
