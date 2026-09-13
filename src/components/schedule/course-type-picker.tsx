import type { CourseType } from "@/lib/types/database";
import { groupCourseTypes } from "@/lib/course-types";
import { Label } from "@/components/ui/label";

type CourseTypeOption = Pick<CourseType, "id" | "name"> &
  Partial<Pick<CourseType, "category" | "sort_order">>;

type CourseTypePickerProps = {
  courseTypes: CourseTypeOption[];
  name?: string;
  required?: boolean;
};

export function CourseTypePicker({
  courseTypes,
  name = "course_type_id",
  required = true,
}: CourseTypePickerProps) {
  const sections = groupCourseTypes(courseTypes);

  return (
    <div className="space-y-2">
      <Label htmlFor={name}>Course type</Label>
      <select
        id={name}
        name={name}
        required={required}
        className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
      >
        <option value="">Select course type</option>
        {sections.map((section) => (
          <optgroup key={section.category} label={section.category}>
            {section.courses.map((courseType) => (
              <option key={courseType.id} value={courseType.id}>
                {courseType.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}
