import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { parseISO } from "date-fns";

export type DisplayTimezone = "CET" | "CST";

export const TIMEZONE_OPTIONS: {
  id: DisplayTimezone;
  label: string;
  iana: string;
}[] = [
  { id: "CET", label: "CET", iana: "Europe/Berlin" },
  { id: "CST", label: "China", iana: "Asia/Shanghai" },
];

export const TIMEZONE_STORAGE_KEY = "linguigo-display-timezone";

export function getTimezoneIana(id: DisplayTimezone): string {
  return TIMEZONE_OPTIONS.find((option) => option.id === id)?.iana ?? "Europe/Berlin";
}

export function formatInDisplayTimezone(
  iso: string,
  timezone: DisplayTimezone,
  pattern = "HH:mm"
): string {
  return formatInTimeZone(parseISO(iso), getTimezoneIana(timezone), pattern);
}

export function formatTimeRangeInTimezone(
  startsAt: string,
  endsAt: string,
  timezone: DisplayTimezone
): string {
  return `${formatInDisplayTimezone(startsAt, timezone)} – ${formatInDisplayTimezone(endsAt, timezone)}`;
}

export function combineDayAndTimeInTimezone(
  day: Date,
  timeValue: string,
  timezone: DisplayTimezone
): Date {
  const [hours, minutes] = timeValue.split(":").map(Number);
  const year = day.getFullYear();
  const month = String(day.getMonth() + 1).padStart(2, "0");
  const date = String(day.getDate()).padStart(2, "0");
  const hour = String(hours).padStart(2, "0");
  const minute = String(minutes).padStart(2, "0");
  const localIso = `${year}-${month}-${date}T${hour}:${minute}:00`;
  return fromZonedTime(localIso, getTimezoneIana(timezone));
}

export function toTimeInputValue(iso: string, timezone: DisplayTimezone): string {
  return formatInTimeZone(parseISO(iso), getTimezoneIana(timezone), "HH:mm");
}
