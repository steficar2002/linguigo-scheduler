import { requireRole, getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  MyStudentsPanel,
  type TeacherStudent,
} from "@/components/teacher/my-students-panel";
import type { StudentStatus } from "@/lib/types/database";

const studentStatuses = new Set<StudentStatus>([
  "active",
  "paused",
  "atx",
  "ex",
  "refunded",
]);

const statusOrder: StudentStatus[] = [
  "active",
  "paused",
  "atx",
  "ex",
  "refunded",
];

export default async function TeacherStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  await requireRole("teacher");
  const userId = await getUser();
  const { q: rawQuery, status: rawStatus } = await searchParams;
  const q = rawQuery?.trim().replace(/[%,().\\]/g, "") ?? "";
  const supabase = await createClient();

  const { data: statusRows } = await supabase
    .from("students")
    .select("status")
    .eq("teacher_id", userId!);

  const availableStatuses = statusOrder.filter((status) =>
    (statusRows ?? []).some((row) => row.status === status),
  );

  const status =
    studentStatuses.has(rawStatus as StudentStatus) &&
    availableStatuses.includes(rawStatus as StudentStatus)
      ? (rawStatus as StudentStatus)
      : undefined;

  let query = supabase
    .from("students")
    .select(
      "id, full_name, status, duration_minutes, classes_per_week, alert, teacher_id, username",
    )
    .eq("teacher_id", userId!)
    .order("full_name");

  if (status) {
    query = query.eq("status", status);
  }

  if (q) {
    query = query.or(`full_name.ilike.%${q}%,username.ilike.%${q}%`);
  }

  const { data: students } = await query;

  return (
    <MyStudentsPanel
      students={(students ?? []) as TeacherStudent[]}
      q={q}
      status={status}
      availableStatuses={availableStatuses}
    />
  );
}
