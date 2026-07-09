import { endOfDay } from "date-fns";
import type { ClassOutcome } from "@/lib/types/database";

export function canMarkClassOutcome(startsAt: string): boolean {
  return new Date(startsAt) <= new Date();
}

export function canSetOutcomeOnCreate(endsAt: string): boolean {
  return new Date(endsAt) <= new Date();
}

export function isDayTodayOrPast(day: Date): boolean {
  return day <= endOfDay(new Date());
}

export function parseInitialOutcome(
  value: FormDataEntryValue | null,
  endsAt: string
): ClassOutcome {
  const outcome = String(value ?? "scheduled");
  if (!canSetOutcomeOnCreate(endsAt)) {
    return "scheduled";
  }
  if (outcome === "completed" || outcome === "missed") {
    return outcome;
  }
  return "scheduled";
}
