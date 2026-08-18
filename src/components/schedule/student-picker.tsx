"use client";

import { useMemo, useState } from "react";
import type { Student } from "@/lib/types/database";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type StudentOption = Pick<Student, "id" | "full_name">;

type StudentPickerProps = {
  students: StudentOption[];
  name?: string;
  required?: boolean;
};

function sortStudents(students: StudentOption[]) {
  return students.slice().sort((a, b) => {
    if (a.full_name === "Group class") return -1;
    if (b.full_name === "Group class") return 1;
    return a.full_name.localeCompare(b.full_name);
  });
}

export function StudentPicker({
  students,
  name = "student_id",
  required = true,
}: StudentPickerProps) {
  const sorted = useMemo(() => sortStudents(students), [students]);
  const [selectedId, setSelectedId] = useState("");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const suggestions = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return sorted;
    return sorted.filter((student) =>
      student.full_name.toLowerCase().includes(term)
    );
  }, [query, sorted]);

  function pick(student: StudentOption) {
    setSelectedId(student.id);
    setQuery(student.full_name);
    setOpen(false);
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="student_search">Student</Label>
      <input type="hidden" name={name} value={selectedId} required={required} />
      <div className="relative">
          <Input
            id="student_search"
            type="search"
            autoComplete="off"
            placeholder="Search student"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
              if (selectedId) {
                const current = sorted.find((student) => student.id === selectedId);
                if (current && event.target.value !== current.full_name) {
                  setSelectedId("");
                }
              }
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => {
              window.setTimeout(() => setOpen(false), 120);
            }}
          />
          {open ? (
            <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-border bg-popover shadow-md">
              {suggestions.length === 0 ? (
                <p className="px-2.5 py-2 text-sm text-muted-foreground">
                  No matching students.
                </p>
              ) : (
                suggestions.map((student) => (
                  <button
                    key={student.id}
                    type="button"
                    className="block w-full px-2.5 py-1.5 text-left text-sm hover:bg-accent"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => pick(student)}
                  >
                    {student.full_name}
                  </button>
                ))
              )}
            </div>
          ) : null}
        </div>
    </div>
  );
}
