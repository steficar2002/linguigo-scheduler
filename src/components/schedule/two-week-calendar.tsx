"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { format, isSameDay, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ScheduleClass } from "@/lib/types/database";
import {
  classesForDay,
  formatTwoWeekRange,
  formatWeekParam,
  getTwoWeekDays,
  parseWeekParam,
  shiftWeek,
} from "@/lib/schedule";
import { formatTimeRange } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TwoWeekCalendarProps = {
  classes: ScheduleClass[];
  mode: "edit" | "readonly";
  basePath: string;
  onDayClick?: (day: Date) => void;
  pendingClassIds?: string[];
};

export function TwoWeekCalendar({
  classes,
  mode,
  basePath,
  onDayClick,
  pendingClassIds = [],
}: TwoWeekCalendarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const weekStart = useMemo(
    () => parseWeekParam(searchParams.get("week")),
    [searchParams]
  );
  const days = useMemo(() => getTwoWeekDays(weekStart), [weekStart]);
  const today = new Date();
  const pendingSet = useMemo(
    () => new Set(pendingClassIds),
    [pendingClassIds]
  );

  function navigate(direction: -1 | 1) {
    const nextWeek = shiftWeek(weekStart, direction);
    const params = new URLSearchParams(searchParams.toString());
    params.set("week", formatWeekParam(nextWeek));
    router.push(`${basePath}?${params.toString()}`);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={() => navigate(-1)}
          aria-label="Previous week"
        >
          <ChevronLeft />
        </Button>
        <p className="text-sm font-medium">{formatTwoWeekRange(weekStart)}</p>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={() => navigate(1)}
          aria-label="Next week"
        >
          <ChevronRight />
        </Button>
      </div>

      <div
        key={formatWeekParam(weekStart)}
        className="grid grid-cols-7 gap-2 animate-fade-in"
      >
        {days.map((day) => {
          const dayClasses = classesForDay(classes, day);
          const isToday = isSameDay(day, today);
          const hasPending = dayClasses.some((c) => pendingSet.has(c.id));
          const clickable =
            mode === "edit"
              ? !!onDayClick
              : !!onDayClick && dayClasses.length > 0;

          return (
            <button
              key={day.toISOString()}
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onDayClick?.(day)}
              className={cn(
                "relative flex min-h-28 flex-col rounded-xl border border-border/60 bg-card p-2 text-left shadow-sm transition-all",
                isToday && "border-primary/40 ring-1 ring-primary/20",
                clickable && "cursor-pointer hover:border-primary/30 hover:shadow-md",
                !clickable && "cursor-default"
              )}
            >
              {hasPending ? (
                <span
                  className="absolute right-2 top-2 size-2.5 rounded-full bg-red-500"
                  title="Pending reschedule request"
                />
              ) : null}
              <span
                className={cn(
                  "mb-2 text-xs font-medium",
                  isToday ? "text-primary" : "text-muted-foreground"
                )}
              >
                {format(day, "EEE d")}
              </span>
              <div className="flex flex-1 flex-col gap-1 overflow-hidden">
                {dayClasses.length === 0 ? (
                  <span className="text-[10px] text-muted-foreground">
                    {mode === "edit" ? "Click to add" : "No classes"}
                  </span>
                ) : (
                  dayClasses.map((classItem) => (
                    <div
                      key={classItem.id}
                      className={cn(
                        "truncate rounded-md px-1.5 py-1 text-[10px] leading-tight",
                        pendingSet.has(classItem.id)
                          ? "bg-red-50 ring-1 ring-red-200"
                          : "bg-primary/5"
                      )}
                    >
                      <p className="truncate font-medium">
                        {classItem.student?.full_name ?? "Student"}
                      </p>
                      <p className="truncate text-muted-foreground">
                        {classItem.course_type?.name ?? "Class"}
                      </p>
                      <p className="truncate">
                        {formatTimeRange(classItem.starts_at, classItem.ends_at)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
