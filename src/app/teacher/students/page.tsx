import { requireRole, getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  MyStudentsPanel,
  type TeacherStudent,
} from "@/components/teacher/my-students-panel";

export default async function TeacherStudentsPage() {
  await requireRole("teacher");
  const userId = await getUser();
  const supabase = await createClient();

  const { data: students } = await supabase
    .from("students")
    .select(
      "id, full_name, status, duration_minutes, classes_per_week, alert, teacher_id",
    )
    .eq("teacher_id", userId!)
    .order("full_name");

  return <MyStudentsPanel students={(students ?? []) as TeacherStudent[]} />;
}
