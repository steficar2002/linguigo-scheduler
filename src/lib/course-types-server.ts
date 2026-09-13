import { attachCourseCatalog } from "@/lib/course-types";
import type { CourseType } from "@/lib/types/database";
import { createClient } from "@/lib/supabase/server";

export async function loadCourseTypes() {
  const supabase = await createClient();
  const full = await supabase
    .from("course_types")
    .select("id, name, description, category, sort_order, created_at, updated_at");

  const rows =
    full.error || !full.data
      ? (
          await supabase
            .from("course_types")
            .select("id, name, description, created_at, updated_at")
        ).data
      : full.data;

  return attachCourseCatalog((rows ?? []) as CourseType[]);
}
