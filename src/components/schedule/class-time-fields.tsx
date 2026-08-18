"use client";

import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { DURATION_PRESETS, inferDurationMinutes } from "@/lib/class-duration";
import {
  combineDayAndTimeInTimezone,
  toTimeInputValue,
  type DisplayTimezone,
} from "@/lib/timezone";
import {
  TimezoneToggle,
  useDisplayTimezone,
} from "@/components/schedule/timezone-toggle";

type ClassTimeFieldsProps = {
  day: Date;
  defaultStartsAt?: string;
  defaultEndsAt?: string;
  idPrefix?: string;
};

export function ClassTimeFields({
  day,
  defaultStartsAt,
  defaultEndsAt,
  idPrefix = "",
}: ClassTimeFieldsProps) {
  const timezone = useDisplayTimezone();
  const defaultTime = useMemo(() => {
    if (defaultStartsAt) {
      return toTimeInputValue(defaultStartsAt, timezone);
    }
    return "09:00";
  }, [defaultStartsAt, timezone]);

  const defaultDuration = useMemo(() => {
    if (defaultStartsAt && defaultEndsAt) {
      return inferDurationMinutes(defaultStartsAt, defaultEndsAt);
    }
    return 40;
  }, [defaultStartsAt, defaultEndsAt]);

  return (
    <>
      <input type="hidden" name="display_timezone" value={timezone} />
      <input type="hidden" name="class_date" value={day.toISOString()} />
      <div className="flex items-center justify-between gap-3">
        <Label>Time zone</Label>
        <TimezoneToggle />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}start_time`}>Start time</Label>
          <Input
            id={`${idPrefix}start_time`}
            name="start_time"
            type="time"
            defaultValue={defaultTime}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}duration_minutes`}>Duration</Label>
          <select
            id={`${idPrefix}duration_minutes`}
            name="duration_minutes"
            defaultValue={defaultDuration}
            required
            className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
          >
            {DURATION_PRESETS.map((preset) => (
              <option key={preset.minutes} value={preset.minutes}>
                {preset.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </>
  );
}

export function buildClassTimesFromForm(
  formData: FormData,
  day: Date
): { starts_at: string; ends_at: string; error?: string } {
  const timeValue = String(formData.get("start_time") ?? "");
  const durationMinutes = Number(formData.get("duration_minutes") ?? 40);
  const timezone = String(formData.get("display_timezone") ?? "CET") as DisplayTimezone;

  if (!timeValue) {
    return { starts_at: "", ends_at: "", error: "Start time is required." };
  }

  const startsAt = combineDayAndTimeInTimezone(day, timeValue, timezone);
  const endsAt = new Date(startsAt.getTime() + durationMinutes * 60 * 1000);

  if (endsAt <= startsAt) {
    return { starts_at: "", ends_at: "", error: "Invalid duration." };
  }

  return {
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
  };
}
