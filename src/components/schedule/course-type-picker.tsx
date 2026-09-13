"use client";

import { useMemo, useState } from "react";
import type { CourseType } from "@/lib/types/database";
import { groupCourseTypes } from "@/lib/course-types";
import { Input } from "@/components/ui/input";
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
  const [selectedId, setSelectedId] = useState("");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const selected = courseTypes.find((course) => course.id === selectedId);

  const sections = useMemo(() => {
    const term = query.trim().toLowerCase();
    const matches = !term
      ? courseTypes
      : courseTypes.filter(
          (course) =>
            course.name.toLowerCase().includes(term) ||
            (course.category ?? "").toLowerCase().includes(term)
        );
    return groupCourseTypes(matches);
  }, [courseTypes, query]);

  function pick(course: CourseTypeOption) {
    setSelectedId(course.id);
    setQuery(course.name);
    setOpen(false);
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="course_type_search">Course type</Label>
      <input type="hidden" name={name} value={selectedId} required={required} />
      <div className="relative">
        <Input
          id="course_type_search"
          type="search"
          autoComplete="off"
          placeholder="Search course type"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            if (selected && event.target.value !== selected.name) {
              setSelectedId("");
            }
          }}
          onFocus={() => {
            if (selected && query === selected.name) {
              setQuery("");
            }
            setOpen(true);
          }}
          onBlur={() => {
            window.setTimeout(() => {
              setOpen(false);
              if (selected) setQuery(selected.name);
            }, 120);
          }}
        />
        {open ? (
          <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-border bg-popover shadow-md">
            {sections.length === 0 ? (
              <p className="px-2.5 py-2 text-sm text-muted-foreground">
                No matching course types.
              </p>
            ) : (
              sections.map((section) => (
                <div key={section.category}>
                  <p className="sticky top-0 bg-muted px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {section.category}
                  </p>
                  {section.courses.map((courseType) => (
                    <button
                      key={courseType.id}
                      type="button"
                      className="block w-full px-2.5 py-1.5 text-left text-sm hover:bg-accent"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => pick(courseType)}
                    >
                      {courseType.name}
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
