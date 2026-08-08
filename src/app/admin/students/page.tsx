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
  const q = rawQuery?.trim() ?? "";
  const status = studentStatuses.has(rawStatus as StudentStatus)
    ? (rawStatus as StudentStatus)
    : undefined;
  const supabase = await createClient();
  let query = supabase
    .from("students")
    .select("*, teacher:profiles!students_teacher_id_fkey(id, full_name, username)")
    .order("full_name");

  if (status) {
    query = query.eq("status", status);
  }

  if (q) {
    query = query.or(`full_name.ilike.%${q}%,username.ilike.%${q}%`);
  }

  const { data: students } = await query;

  return <StudentsPanel students={(students ?? []) as StudentWithTeacher[]} q={q} status={status} />;
}
