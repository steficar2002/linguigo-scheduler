import { attachCourseCatalog } from "@/lib/course-types";
import { createClient } from "@/lib/supabase/server";
import { CourseTypesPanel } from "@/components/admin/course-types-panel";
import type { CourseType } from "@/lib/types/database";

export default async function CourseTypesPage() {
  const supabase = await createClient();
  const { data: courseTypes } = await supabase
    .from("course_types")
    .select("id, name, description, created_at, updated_at")
    .order("name");

  return (
    <CourseTypesPanel
      courseTypes={attachCourseCatalog(courseTypes ?? []) as CourseType[]}
    />
  );
}
