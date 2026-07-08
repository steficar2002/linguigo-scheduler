"use client";

import {
  addDays,
  eachDayOfInterval,
  format,
  isSameDay,
  parseISO,
  startOfWeek,
} from "date-fns";
import type { TeacherClass } from "@/components/teacher/class-list";

export function ClassCalendar({ classes }: { classes: TeacherClass[] }) {
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const days = eachDayOfInterval({
    start: weekStart,
    end: addDays(weekStart, 6),
  });

  const classesByDay = days.map((day) => ({
    day,
    classes: classes.filter((classItem) =>
      isSameDay(parseISO(classItem.starts_at), day)
    ),
  }));

  return (
    <div className="grid gap-3 md:grid-cols-7">
      {classesByDay.map(({ day, classes: dayClasses }) => (
        <div key={day.toISOString()} className="rounded-lg border p-3">
          <p className="mb-3 text-sm font-medium">
            {format(day, "EEE d MMM")}
          </p>
          <div className="space-y-2">
            {dayClasses.length === 0 ? (
              <p className="text-xs text-muted-foreground">No classes</p>
            ) : (
              dayClasses.map((classItem) => (
                <div
                  key={classItem.id}
                  className="rounded-md bg-muted p-2 text-xs leading-relaxed"
                >
                  <p className="font-medium">
                    {classItem.student?.full_name ?? "Student"}
                  </p>
                  <p className="text-muted-foreground">
                    {classItem.course_type?.name ?? "Class"}
                  </p>
                  <p>
                    {format(parseISO(classItem.starts_at), "h:mm a")} –{" "}
                    {format(parseISO(classItem.ends_at), "h:mm a")}
                  </p>
                  {classItem.materialUrl ? (
                    <a
                      href={classItem.materialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-block underline"
                    >
                      PDF
                    </a>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
