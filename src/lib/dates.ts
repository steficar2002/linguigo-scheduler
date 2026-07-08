import { format, parseISO } from "date-fns";

export function toDatetimeLocalValue(iso: string) {
  return format(parseISO(iso), "yyyy-MM-dd'T'HH:mm");
}

export function formatClassTime(startsAt: string, endsAt: string) {
  const start = parseISO(startsAt);
  const end = parseISO(endsAt);
  return `${format(start, "EEE, MMM d · h:mm a")} – ${format(end, "h:mm a")}`;
}
