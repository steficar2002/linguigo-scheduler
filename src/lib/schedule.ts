import {
  addDays,
  addWeeks,
  eachDayOfInterval,
  format,
  isSameDay,
  parseISO,
  startOfWeek,
} from "date-fns";

export function getWeekStart(date: Date) {
  return startOfWeek(date, { weekStartsOn: 1 });
}

export function getTwoWeekDays(weekStart: Date) {
  return eachDayOfInterval({
    start: weekStart,
    end: addDays(weekStart, 13),
  });
}

export function formatTwoWeekRange(weekStart: Date) {
  const end = addDays(weekStart, 13);
  const sameYear = weekStart.getFullYear() === end.getFullYear();
  const startFmt = sameYear ? "d MMM" : "d MMM yyyy";
  return `${format(weekStart, startFmt)} – ${format(end, "d MMM yyyy")}`;
}

export function parseWeekParam(value: string | null | undefined): Date {
  if (!value) return getWeekStart(new Date());
  const parsed = parseISO(value);
  if (Number.isNaN(parsed.getTime())) return getWeekStart(new Date());
  return getWeekStart(parsed);
}

export function shiftWeek(weekStart: Date, direction: -1 | 1) {
  return addWeeks(weekStart, direction);
}

export function formatWeekParam(weekStart: Date) {
  return format(weekStart, "yyyy-MM-dd");
}

export function classesForDay<T extends { starts_at: string }>(
  classes: T[],
  day: Date
) {
  return classes.filter((c) => isSameDay(parseISO(c.starts_at), day));
}

export function timesOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date
) {
  return aStart < bEnd && bStart < aEnd;
}

export function hasOverlapOnDay(
  classes: { id?: string; starts_at: string; ends_at: string }[],
  startsAt: Date,
  endsAt: Date,
  excludeId?: string
) {
  return classes.some((c) => {
    if (excludeId && c.id === excludeId) return false;
    if (!isSameDay(parseISO(c.starts_at), startsAt)) return false;
    return timesOverlap(
      startsAt,
      endsAt,
      parseISO(c.starts_at),
      parseISO(c.ends_at)
    );
  });
}

export function buildWeeklyOccurrences(
  startsAt: Date,
  endsAt: Date,
  totalWeeks: number
) {
  const durationMs = endsAt.getTime() - startsAt.getTime();
  return Array.from({ length: totalWeeks }, (_, weekIndex) => {
    const occurrenceStart = addWeeks(startsAt, weekIndex);
    return {
      startsAt: occurrenceStart,
      endsAt: new Date(occurrenceStart.getTime() + durationMs),
    };
  });
}

export function findRecurringOverlap(
  classes: { id?: string; starts_at: string; ends_at: string }[],
  occurrences: { startsAt: Date; endsAt: Date }[]
) {
  for (const occurrence of occurrences) {
    if (hasOverlapOnDay(classes, occurrence.startsAt, occurrence.endsAt)) {
      return occurrence.startsAt;
    }
  }
  return null;
}
