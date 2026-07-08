"use client";

import { useState } from "react";
import { addDays, format, parseISO } from "date-fns";
import { ExternalLink, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import type { RescheduleRequest, ScheduleClass } from "@/lib/types/database";
import { formatTimeRange, toDatetimeLocalValueFromDate } from "@/lib/dates";
import { requestReschedule } from "@/app/teacher/schedule/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type TeacherDayDialogProps = {
  day: Date | null;
  classes: ScheduleClass[];
  pendingRequests: RescheduleRequest[];
  onClose: () => void;
};

function defaultRescheduleTimes(classItem: ScheduleClass) {
  const start = parseISO(classItem.starts_at);
  const end = parseISO(classItem.ends_at);
  const durationMs = end.getTime() - start.getTime();
  const newStart = addDays(start, 7);
  const newEnd = new Date(newStart.getTime() + durationMs);
  return {
    startsAt: toDatetimeLocalValueFromDate(newStart),
    endsAt: toDatetimeLocalValueFromDate(newEnd),
  };
}

export function TeacherDayDialog({
  day,
  classes,
  pendingRequests,
  onClose,
}: TeacherDayDialogProps) {
  const [reschedulingClass, setReschedulingClass] =
    useState<ScheduleClass | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!day) return null;

  const dayLabel = format(day, "EEEE, d MMMM yyyy");
  const pendingByClass = new Map(
    pendingRequests.map((r) => [r.class_id, r])
  );

  async function handleSubmitReschedule(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!reschedulingClass) return;

    setSubmitting(true);
    const formData = new FormData(e.currentTarget);
    formData.set("class_id", reschedulingClass.id);

    const result = await requestReschedule(formData);
    setSubmitting(false);

    if (result?.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Reschedule request sent.");
    setReschedulingClass(null);
    onClose();
  }

  const rescheduleDefaults = reschedulingClass
    ? defaultRescheduleTimes(reschedulingClass)
    : null;

  return (
    <>
      <Dialog open={!!day && !reschedulingClass} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{dayLabel}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            {classes.map((classItem) => {
              const pending = pendingByClass.get(classItem.id);

              return (
                <div
                  key={classItem.id}
                  className="rounded-lg border border-border/60 p-4 space-y-3"
                >
                  <div className="text-sm">
                    <p className="font-medium">
                      {classItem.student?.full_name ?? "Student"}
                    </p>
                    <p className="text-muted-foreground">
                      {classItem.course_type?.name ?? "Class"}
                    </p>
                    <p className="text-xs">
                      {formatTimeRange(classItem.starts_at, classItem.ends_at)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {classItem.materialUrl ? (
                      <Button
                        size="sm"
                        variant="outline"
                        nativeButton={false}
                        render={
                          <a
                            href={classItem.materialUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          />
                        }
                      >
                        <ExternalLink className="size-3.5" />
                        Open PDF
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground self-center">
                        No material uploaded
                      </span>
                    )}

                    {pending ? (
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
                        <CalendarClock className="size-3.5" />
                        Reschedule pending
                        {pending.requested_starts_at ? (
                          <span className="text-amber-700">
                            → {format(parseISO(pending.requested_starts_at), "d MMM")}
                          </span>
                        ) : null}
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setReschedulingClass(classItem)}
                      >
                        <CalendarClock className="size-3.5" />
                        Request reschedule
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!reschedulingClass}
        onOpenChange={(open) => !open && setReschedulingClass(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Choose new date & time</DialogTitle>
          </DialogHeader>
          {reschedulingClass && rescheduleDefaults ? (
            <form onSubmit={handleSubmitReschedule} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {reschedulingClass.student?.full_name} ·{" "}
                {reschedulingClass.course_type?.name}
              </p>
              <p className="text-xs text-muted-foreground">
                Current:{" "}
                {format(parseISO(reschedulingClass.starts_at), "EEE, d MMM · h:mm a")}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="requested_starts_at">New start</Label>
                  <Input
                    id="requested_starts_at"
                    name="requested_starts_at"
                    type="datetime-local"
                    defaultValue={rescheduleDefaults.startsAt}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="requested_ends_at">New end</Label>
                  <Input
                    id="requested_ends_at"
                    name="requested_ends_at"
                    type="datetime-local"
                    defaultValue={rescheduleDefaults.endsAt}
                    required
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1" disabled={submitting}>
                  {submitting ? "Sending…" : "Send request"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setReschedulingClass(null)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
