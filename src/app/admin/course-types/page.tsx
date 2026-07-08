import { createClient } from "@/lib/supabase/server";
import { CourseTypesPanel } from "@/components/admin/course-types-panel";

export default async function CourseTypesPage() {
  const supabase = await createClient();
  const { data: courseTypes } = await supabase
    .from("course_types")
    .select("*")
    .order("name");

  return <CourseTypesPanel courseTypes={courseTypes ?? []} />;
}
