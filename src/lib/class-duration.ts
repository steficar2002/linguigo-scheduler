export const DURATION_PRESETS = [
  { label: "25 min", minutes: 25 },
  { label: "40 min", minutes: 40 },
  { label: "55 min", minutes: 55 },
] as const;

export type DurationMinutes = (typeof DURATION_PRESETS)[number]["minutes"];

export function isValidDuration(minutes: number): minutes is DurationMinutes {
  return DURATION_PRESETS.some((preset) => preset.minutes === minutes);
}

export function computeEndsAt(startsAt: Date, durationMinutes: number): Date {
  return new Date(startsAt.getTime() + durationMinutes * 60 * 1000);
}

export function inferDurationMinutes(
  startsAt: string,
  endsAt: string
): DurationMinutes {
  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();
  const minutes = Math.round((end - start) / 60000);
  const match = DURATION_PRESETS.find((preset) => preset.minutes === minutes);
  return match?.minutes ?? 40;
}
