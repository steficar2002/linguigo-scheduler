import { createClient } from "@/lib/supabase/server";
import { ClassesPanel } from "@/components/admin/classes-panel";

export default async function ClassesPage() {
  const supabase = await createClient();

  const [{ data: classes }, { data: teachers }, { data: students }, { data: courseTypes }] =
    await Promise.all([
      supabase
        .from("classes")
        .select(
          "*, student:students(full_name), course_type:course_types(name), teacher:profiles!classes_teacher_id_fkey(full_name)"
        )
        .order("starts_at"),
      supabase
        .from("profiles")
        .select("*")
        .eq("role", "teacher")
        .eq("is_active", true)
        .order("full_name"),
      supabase.from("students").select("*").order("full_name"),
      supabase.from("course_types").select("*").order("name"),
    ]);

  return (
    <ClassesPanel
      classes={classes ?? []}
      teachers={teachers ?? []}
      students={students ?? []}
      courseTypes={courseTypes ?? []}
    />
  );
}
