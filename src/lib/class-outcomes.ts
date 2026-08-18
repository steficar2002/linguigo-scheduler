import type { ClassOutcome } from "@/lib/types/database";

export const OUTCOME_LABELS: Record<ClassOutcome, string> = {
  scheduled: "Scheduled",
  completed: "Successful",
  canceled_on_time: "Canceled on time",
  late_cancel: "Late cancel",
  missed: "Canceled on time",
};

export const MARKABLE_OUTCOMES = [
  "completed",
  "canceled_on_time",
  "late_cancel",
] as const satisfies readonly ClassOutcome[];

export function canMarkClassOutcome(startsAt: string): boolean {
  return new Date(startsAt) <= new Date();
}

export function canSetOutcomeOnCreate(endsAt: string): boolean {
  return new Date(endsAt) <= new Date();
}

export function isDayTodayOrPast(day: Date): boolean {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return day <= end;
}

export function parseInitialOutcome(
  value: FormDataEntryValue | null,
  endsAt: string
): ClassOutcome {
  const outcome = String(value ?? "scheduled");
  if (!canSetOutcomeOnCreate(endsAt)) {
    return "scheduled";
  }
  if (
    outcome === "completed" ||
    outcome === "canceled_on_time" ||
    outcome === "late_cancel"
  ) {
    return outcome;
  }
  return "scheduled";
}

export function payableHours(
  outcome: ClassOutcome,
  startsAt: string,
  endsAt: string
): number {
  if (outcome === "late_cancel") {
    return 25 / 60;
  }
  if (outcome === "completed") {
    const ms = new Date(endsAt).getTime() - new Date(startsAt).getTime();
    if (ms <= 0) return 0;
    return ms / (1000 * 60 * 60);
  }
  return 0;
}
