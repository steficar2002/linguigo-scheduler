import type { ScheduleClass } from "@/lib/types/database";
import { getSignedUrl } from "@/lib/storage";

export async function attachMaterialUrls(
  classes: ScheduleClass[]
): Promise<ScheduleClass[]> {
  return Promise.all(
    classes.map(async (classItem) => {
      if (!classItem.material_path) {
        return classItem;
      }

      const materialUrl = await getSignedUrl(
        "class-materials",
        classItem.material_path
      );

      return { ...classItem, materialUrl };
    })
  );
}
