export const COURSE_CATEGORY_ORDER = [
  "Cambridge Exam Preparation",
  "Other Exam Preparation",
  "General English & Intensive Skills",
  "Reading & Discussion",
  "Communication & Professional English",
  "Academic Subjects",
] as const;

export type CourseCategory = (typeof COURSE_CATEGORY_ORDER)[number];

export function groupCourseTypes<
  T extends { name: string; category?: string | null; sort_order?: number | null },
>(courseTypes: T[]) {
  const grouped = new Map<string, T[]>();
  for (const category of COURSE_CATEGORY_ORDER) {
    grouped.set(category, []);
  }

  const uncategorized: T[] = [];
  const sorted = [...courseTypes].sort((a, b) => {
    const order = (a.sort_order ?? 0) - (b.sort_order ?? 0);
    if (order !== 0) return order;
    return a.name.localeCompare(b.name);
  });

  for (const courseType of sorted) {
    const category = courseType.category;
    if (category && grouped.has(category)) {
      grouped.get(category)!.push(courseType);
    } else {
      uncategorized.push(courseType);
    }
  }

  const sections: { category: string; courses: T[] }[] =
    COURSE_CATEGORY_ORDER.flatMap((category) => {
      const courses = grouped.get(category) ?? [];
      return courses.length > 0 ? [{ category, courses }] : [];
    });

  if (uncategorized.length > 0) {
    sections.push({ category: "Other", courses: uncategorized });
  }

  return sections;
}
