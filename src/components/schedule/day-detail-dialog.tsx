"use client";

import { useState } from "react";
import { format, setHours, setMinutes } from "date-fns";
import { toast } from "sonner";
import type {
  CourseType,
  RescheduleRequest,
  ScheduleClass,
  Student,
} from "@/lib/types/database";
import { formatTimeRange, formatClassTime, toDatetimeLocalValue } from "@/lib/dates";
import {
  buildWeeklyOccurrences,
  findRecurringOverlap,
  hasOverlapOnDay,
} from "@/lib/schedule";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type DayDetailDialogProps = {
  day: Date | null;
  classes: ScheduleClass[];
  allClasses: ScheduleClass[];
  students: Student[];
  courseTypes: CourseType[];
  teacherId: string;
  pendingRequests: RescheduleRequest[];
  onClose: () => void;
  onCreate: (formData: FormData) => Promise<{ error?: string } | void>;
  onDelete: (classId: string) => Promise<{ error?: string } | void>;
  onReschedule: (formData: FormData) => Promise<{ error?: string } | void>;
  onApproveRequest: (requestId: string) => Promise<{ error?: string } | void>;
  onDenyRequest: (requestId: string) => Promise<{ error?: string } | void>;
};

function defaultStart(day: Date) {
  return setMinutes(setHours(day, 9), 0);
}

function defaultEnd(day: Date) {
  return setMinutes(setHours(day, 10), 0);
}

export function DayDetailDialog({
  day,
  classes,
  allClasses,
  students,
  courseTypes,
  teacherId,
  pendingRequests,
  onClose,
  onCreate,
  onDelete,
  onReschedule,
  onApproveRequest,
  onDenyRequest,
}: DayDetailDialogProps) {
  const [adding, setAdding] = useState(false);
  const [rescheduling, setRescheduling] = useState<ScheduleClass | null>(null);
  const [repeatWeekly, setRepeatWeekly] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  if (!day) return null;

  const dayLabel = format(day, "EEEE, d MMMM yyyy");
  const pendingByClass = new Map(
    pendingRequests.map((r) => [r.class_id, r])
  );

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("teacher_id", teacherId);

    const startsAt = new Date(String(formData.get("starts_at")));
    const endsAt = new Date(String(formData.get("ends_at")));
    const repeatWeeks = repeatWeekly
      ? Math.min(52, Math.max(2, Number(formData.get("repeat_weeks") || 2)))
      : 1;

    if (endsAt <= startsAt) {
      toast.error("End time must be after start time.");
      return;
    }

    const occurrences = buildWeeklyOccurrences(startsAt, endsAt, repeatWeeks);
    const overlapDate = findRecurringOverlap(allClasses, occurrences);

    if (overlapDate) {
      toast.error(
        `A class already exists on ${format(overlapDate, "d MMM yyyy")} at this time.`
      );
      return;
    }

    if (repeatWeekly) {
      formData.set("repeat_enabled", "true");
      formData.set("repeat_weeks", String(repeatWeeks));
    }

    const result = await onCreate(formData);
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    toast.success(
      repeatWeeks > 1
        ? `${repeatWeeks} classes scheduled.`
        : "Class scheduled."
    );
    setAdding(false);
    setRepeatWeekly(false);
    onClose();
  }

  async function handleReschedule(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!rescheduling) return;

    const formData = new FormData(e.currentTarget);
    const startsAt = new Date(String(formData.get("starts_at")));
    const endsAt = new Date(String(formData.get("ends_at")));

    if (endsAt <= startsAt) {
      toast.error("End time must be after start time.");
      return;
    }

    if (hasOverlapOnDay(allClasses, startsAt, endsAt, rescheduling.id)) {
      toast.error("This time overlaps with another class on the same day.");
      return;
    }

    const result = await onReschedule(formData);
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Class rescheduled.");
    setRescheduling(null);
    onClose();
  }

  async function handleDelete(classId: string) {
    const result = await onDelete(classId);
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Class removed.");
  }

  async function handleApprove(requestId: string) {
    setResolvingId(requestId);
    const result = await onApproveRequest(requestId);
    setResolvingId(null);
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Reschedule request approved.");
    onClose();
  }

  async function handleDeny(requestId: string) {
    setResolvingId(requestId);
    const result = await onDenyRequest(requestId);
    setResolvingId(null);
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Reschedule request denied.");
    onClose();
  }

  return (
    <>
      <Dialog open={!!day && !rescheduling} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{dayLabel}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {classes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No classes this day.</p>
            ) : (
              <div className="space-y-2">
                {classes.map((classItem) => {
                  const pending = pendingByClass.get(classItem.id);

                  return (
                  <div
                    key={classItem.id}
                    className="rounded-lg border border-border/60 p-3 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
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
                    <div className="flex shrink-0 gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setRescheduling(classItem)}
                      >
                        Reschedule
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(classItem.id)}
                      >
                        Remove
                      </Button>
                    </div>
                    </div>

                    {pending ? (
                      <div className="rounded-md border border-red-200 bg-red-50 p-3 space-y-2">
                        <p className="text-sm font-medium text-red-900">
                          Reschedule request
                        </p>
                        <p className="text-xs text-red-800">
                          Teacher requested to move this class
                          {pending.requested_starts_at && pending.requested_ends_at ? (
                            <>
                              {" to "}
                              <span className="font-medium">
                                {formatClassTime(
                                  pending.requested_starts_at,
                                  pending.requested_ends_at
                                )}
                              </span>
                            </>
                          ) : (
                            <>
                              {" on "}
                              {format(
                                new Date(pending.requested_at),
                                "d MMM yyyy 'at' HH:mm"
                              )}
                            </>
                          )}
                          .
                        </p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            disabled={resolvingId === pending.id}
                            onClick={() => handleApprove(pending.id)}
                          >
                            {resolvingId === pending.id ? "Confirming…" : "Confirm"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={resolvingId === pending.id}
                            onClick={() => handleDeny(pending.id)}
                          >
                            Deny
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                  );
                })}
              </div>
            )}

            {adding ? (
              <form onSubmit={handleCreate} className="space-y-3 border-t pt-4">
                <div className="space-y-2">
                  <Label htmlFor="student_id">Student</Label>
                  <select
                    id="student_id"
                    name="student_id"
                    required
                    className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  >
                    <option value="">Select student</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.full_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="course_type_id">Course type</Label>
                  <select
                    id="course_type_id"
                    name="course_type_id"
                    required
                    className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  >
                    <option value="">Select course type</option>
                    {courseTypes.map((ct) => (
                      <option key={ct.id} value={ct.id}>
                        {ct.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="starts_at">Start</Label>
                    <Input
                      id="starts_at"
                      name="starts_at"
                      type="datetime-local"
                      defaultValue={format(defaultStart(day), "yyyy-MM-dd'T'HH:mm")}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ends_at">End</Label>
                    <Input
                      id="ends_at"
                      name="ends_at"
                      type="datetime-local"
                      defaultValue={format(defaultEnd(day), "yyyy-MM-dd'T'HH:mm")}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="material">PDF (optional)</Label>
                  <Input id="material" name="material" type="file" accept="application/pdf" />
                </div>
                <div className="rounded-lg border border-border/60 bg-muted/40 p-3 space-y-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="repeat_enabled"
                      checked={repeatWeekly}
                      onChange={(e) => setRepeatWeekly(e.target.checked)}
                      className="size-4 rounded border-input accent-primary"
                    />
                    <span>Repeat every week for</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="repeat_weeks"
                      name="repeat_weeks"
                      type="number"
                      min={2}
                      max={52}
                      defaultValue={8}
                      disabled={!repeatWeekly}
                      className="w-20"
                    />
                    <Label htmlFor="repeat_weeks" className="text-sm text-muted-foreground">
                      weeks (including this one)
                    </Label>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">
                    {repeatWeekly ? "Schedule classes" : "Add class"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setAdding(false);
                      setRepeatWeekly(false);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <Button className="w-full" onClick={() => setAdding(true)}>
                Add class
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!rescheduling}
        onOpenChange={(open) => !open && setRescheduling(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reschedule class</DialogTitle>
          </DialogHeader>
          {rescheduling ? (
            <form onSubmit={handleReschedule} className="space-y-4">
              <input type="hidden" name="id" value={rescheduling.id} />
              <p className="text-sm text-muted-foreground">
                {rescheduling.student?.full_name} ·{" "}
                {rescheduling.course_type?.name}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="reschedule_starts_at">New start</Label>
                  <Input
                    id="reschedule_starts_at"
                    name="starts_at"
                    type="datetime-local"
                    defaultValue={toDatetimeLocalValue(rescheduling.starts_at)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reschedule_ends_at">New end</Label>
                  <Input
                    id="reschedule_ends_at"
                    name="ends_at"
                    type="datetime-local"
                    defaultValue={toDatetimeLocalValue(rescheduling.ends_at)}
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full">
                Save reschedule
              </Button>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
