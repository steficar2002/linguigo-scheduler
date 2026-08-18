import {
  endOfDay,
  endOfYesterday,
  startOfDay,
  startOfYesterday,
  subDays,
} from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { payableHours } from "@/lib/class-outcomes";
import type { ClassOutcome, TeacherStats, TeacherStatsPeriod } from "@/lib/types/database";

type ClassRow = {
  outcome: ClassOutcome;
  starts_at: string;
  ends_at: string;
};

function calculatePayment(
  classes: ClassRow[],
  salaryPerHour: number
): number {
  return classes.reduce(
    (total, row) =>
      total + payableHours(row.outcome, row.starts_at, row.ends_at) * salaryPerHour,
    0
  );
}

function aggregatePeriod(
  classes: ClassRow[],
  rangeStart: Date,
  rangeEnd: Date,
  salaryPerHour: number
): TeacherStatsPeriod {
  const inRange = classes.filter((row) => {
    const startsAt = new Date(row.starts_at);
    return startsAt >= rangeStart && startsAt <= rangeEnd;
  });

  const successful = inRange.filter((row) => row.outcome === "completed");
  const canceledOnTime = inRange.filter(
    (row) => row.outcome === "canceled_on_time" || row.outcome === "missed"
  ).length;
  const lateCancel = inRange.filter((row) => row.outcome === "late_cancel").length;

  return {
    total: inRange.length,
    successful: successful.length,
    canceledOnTime,
    lateCancel,
    payment: calculatePayment(inRange, salaryPerHour),
  };
}

export async function getTeacherStatsForRange(
  teacherId: string,
  salaryPerHour: number,
  rangeStart: Date,
  rangeEnd: Date
): Promise<TeacherStatsPeriod> {
  const supabase = await createClient();
  const { data: classes } = await supabase
    .from("classes")
    .select("outcome, starts_at, ends_at")
    .eq("teacher_id", teacherId)
    .gte("starts_at", startOfDay(rangeStart).toISOString())
    .lte("starts_at", endOfDay(rangeEnd).toISOString());

  return aggregatePeriod(
    classes ?? [],
    startOfDay(rangeStart),
    endOfDay(rangeEnd),
    salaryPerHour
  );
}

export async function getTeacherStats(
  teacherId: string,
  salaryPerHour: number
): Promise<TeacherStats> {
  const supabase = await createClient();
  const now = new Date();
  const monthStart = startOfDay(subDays(now, 30));

  const { data: classes } = await supabase
    .from("classes")
    .select("outcome, starts_at, ends_at")
    .eq("teacher_id", teacherId)
    .gte("starts_at", monthStart.toISOString())
    .lte("starts_at", endOfDay(now).toISOString());

  const rows = classes ?? [];

  return {
    today: aggregatePeriod(
      rows,
      startOfDay(now),
      endOfDay(now),
      salaryPerHour
    ),
    yesterday: aggregatePeriod(
      rows,
      startOfYesterday(),
      endOfYesterday(),
      salaryPerHour
    ),
    pastWeek: aggregatePeriod(
      rows,
      startOfDay(subDays(now, 6)),
      endOfDay(now),
      salaryPerHour
    ),
    pastMonth: aggregatePeriod(
      rows,
      startOfDay(subDays(now, 29)),
      endOfDay(now),
      salaryPerHour
    ),
  };
}
