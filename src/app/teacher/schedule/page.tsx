import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { TeacherSchedule } from "@/components/teacher/teacher-schedule";
import type { TeacherClass } from "@/components/teacher/class-list";

export default async function TeacherSchedulePage() {
  const userId = await getUser();
  const supabase = await createClient();

  const { data: classes } = await supabase
    .from("classes")
    .select(
      "*, student:students(full_name), course_type:course_types(name), teacher:profiles!classes_teacher_id_fkey(full_name)"
    )
    .eq("teacher_id", userId!)
    .gte("starts_at", new Date().toISOString())
    .order("starts_at");

  const classesWithUrls: TeacherClass[] = await Promise.all(
    (classes ?? []).map(async (classItem) => {
      if (!classItem.material_path) {
        return { ...classItem, materialUrl: null };
      }

      const { data } = await supabase.storage
        .from("class-materials")
        .createSignedUrl(classItem.material_path, 3600);

      return {
        ...classItem,
        materialUrl: data?.signedUrl ?? null,
      };
    })
  );

  return <TeacherSchedule classes={classesWithUrls} />;
}
