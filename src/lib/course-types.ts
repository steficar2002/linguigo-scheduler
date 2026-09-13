export const COURSE_CATEGORY_ORDER = [
  "Cambridge Exam Preparation",
  "Other Exam Preparation",
  "General English & Intensive Skills",
  "Reading & Discussion",
  "Communication & Professional English",
  "Academic Subjects",
] as const;

export type CourseCategory = (typeof COURSE_CATEGORY_ORDER)[number];

export const COURSE_CATALOG: {
  name: string;
  category: CourseCategory;
  sort_order: number;
}[] = [
  { name: "YLE: Pre A1 Starters", category: "Cambridge Exam Preparation", sort_order: 101 },
  { name: "YLE: A1 Movers", category: "Cambridge Exam Preparation", sort_order: 102 },
  { name: "YLE: A2 Flyers", category: "Cambridge Exam Preparation", sort_order: 103 },
  { name: "KET: A2 Key", category: "Cambridge Exam Preparation", sort_order: 104 },
  { name: "PET: B1 Preliminary", category: "Cambridge Exam Preparation", sort_order: 105 },
  { name: "FCE: B2 First", category: "Cambridge Exam Preparation", sort_order: 106 },
  { name: "CAE: C1 Advanced", category: "Cambridge Exam Preparation", sort_order: 107 },
  { name: "BEC: Business Preliminary", category: "Cambridge Exam Preparation", sort_order: 108 },
  { name: "BEC: Business Vantage", category: "Cambridge Exam Preparation", sort_order: 109 },
  { name: "BEC: Business Higher", category: "Cambridge Exam Preparation", sort_order: 110 },
  { name: "TOEFL", category: "Other Exam Preparation", sort_order: 201 },
  { name: "IELTS", category: "Other Exam Preparation", sort_order: 202 },
  { name: "SAT", category: "Other Exam Preparation", sort_order: 203 },
  { name: "General English Enhancement", category: "General English & Intensive Skills", sort_order: 301 },
  { name: "Intensive Writing", category: "General English & Intensive Skills", sort_order: 302 },
  { name: "Intensive Speaking", category: "General English & Intensive Skills", sort_order: 303 },
  { name: "Intensive Reading", category: "General English & Intensive Skills", sort_order: 304 },
  { name: "Novel Reading", category: "Reading & Discussion", sort_order: 401 },
  { name: "Daily News", category: "Reading & Discussion", sort_order: 402 },
  { name: "Free Talk / Open Discussion", category: "Reading & Discussion", sort_order: 403 },
  { name: "Public Speaking", category: "Communication & Professional English", sort_order: 501 },
  { name: "Business English", category: "Communication & Professional English", sort_order: 502 },
  { name: "Math", category: "Academic Subjects", sort_order: 601 },
  { name: "Physics", category: "Academic Subjects", sort_order: 602 },
  { name: "History", category: "Academic Subjects", sort_order: 603 },
  { name: "Biology", category: "Academic Subjects", sort_order: 604 },
];

const CATALOG_BY_NAME = new Map(
  COURSE_CATALOG.map((course) => [course.name, course])
);

export function resolveCourseCategory(
  name: string,
  category?: string | null
): string {
  if (category && COURSE_CATEGORY_ORDER.includes(category as CourseCategory)) {
    return category;
  }
  return CATALOG_BY_NAME.get(name)?.category ?? "Other";
}

export function resolveCourseSortOrder(
  name: string,
  sortOrder?: number | null
): number {
  if (typeof sortOrder === "number" && sortOrder > 0) return sortOrder;
  return CATALOG_BY_NAME.get(name)?.sort_order ?? 9999;
}

export function attachCourseCatalog<
  T extends { name: string; category?: string | null; sort_order?: number | null },
>(courseTypes: T[]) {
  return courseTypes.map((course) => ({
    ...course,
    category: resolveCourseCategory(course.name, course.category),
    sort_order: resolveCourseSortOrder(course.name, course.sort_order),
  }));
}

export function groupCourseTypes<
  T extends { name: string; category?: string | null; sort_order?: number | null },
>(courseTypes: T[]) {
  const grouped = new Map<string, T[]>();
  for (const category of COURSE_CATEGORY_ORDER) {
    grouped.set(category, []);
  }
  grouped.set("Other", []);

  const sorted = [...courseTypes].sort((a, b) => {
    const order =
      resolveCourseSortOrder(a.name, a.sort_order) -
      resolveCourseSortOrder(b.name, b.sort_order);
    if (order !== 0) return order;
    return a.name.localeCompare(b.name);
  });

  for (const courseType of sorted) {
    const category = resolveCourseCategory(courseType.name, courseType.category);
    grouped.get(category)?.push(courseType);
  }

  return [...COURSE_CATEGORY_ORDER, "Other"].flatMap((category) => {
    const courses = grouped.get(category) ?? [];
    return courses.length > 0 ? [{ category, courses }] : [];
  });
}
