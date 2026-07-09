"use server";

import { parseISO, isValid } from "date-fns";
import { requireRole } from "@/lib/auth";
import { getTeacherStatsForRange } from "@/lib/teacher-stats";
import type { TeacherStatsPeriod } from "@/lib/types/database";

export async function fetchTeacherStatsForRangeAction(
  teacherId: string,
  salaryPerHour: number,
  from: string,
  to: string
): Promise<{ data?: TeacherStatsPeriod; error?: string }> {
  await requireRole("admin");

  const rangeStart = parseISO(from);
  const rangeEnd = parseISO(to);

  if (!isValid(rangeStart) || !isValid(rangeEnd)) {
    return { error: "Invalid date range." };
  }

  if (rangeEnd < rangeStart) {
    return { error: "End date must be on or after start date." };
  }

  const data = await getTeacherStatsForRange(
    teacherId,
    salaryPerHour,
    rangeStart,
    rangeEnd
  );

  return { data };
}
