"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format, startOfDay } from "date-fns";
import { toast } from "sonner";
import type {
  CourseType,
  Profile,
  RescheduleRequest,
  ScheduleClass,
  Student,
} from "@/lib/types/database";
import { formatClassTime } from "@/lib/dates";
import {
  buildWeeklyOccurrences,
  findRecurringOverlap,
  hasOverlapOnDay,
} from "@/lib/schedule";
import { formatTimeRangeInTimezone } from "@/lib/timezone";
import {
  buildClassTimesFromForm,
  ClassTimeFields,
} from "@/components/schedule/class-time-fields";
import { ClassOutcomeActions } from "@/components/schedule/class-outcome-actions";
import { isDayTodayOrPast } from "@/lib/class-outcomes";
import { useDisplayTimezone } from "@/components/schedule/timezone-toggle";
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
  teachers?: Pick<Profile, "id" | "full_name">[];
  showTeacherPicker?: boolean;
  pendingRequests: RescheduleRequest[];
  onClose: () => void;
  onCreate: (formData: FormData) => Promise<{ error?: string } | void>;
  onDelete: (classId: string) => Promise<{ error?: string } | void>;
  onReschedule: (formData: FormData) => Promise<{ error?: string } | void>;
  onApproveRequest: (requestId: string) => Promise<{ error?: string } | void>;
  onDenyRequest: (requestId: string) => Promise<{ error?: string } | void>;
};

export function DayDetailDialog({
  day,
  classes,
  allClasses,
  students,
  courseTypes,
  teacherId,
  teachers = [],
  showTeacherPicker = false,
  pendingRequests,
  onClose,
  onCreate,
  onDelete,
  onReschedule,
  onApproveRequest,
  onDenyRequest,
}: DayDetailDialogProps) {
  const router = useRouter();
  const timezone = useDisplayTimezone();
  const [adding, setAdding] = useState(false);
  const [rescheduling, setRescheduling] = useState<ScheduleClass | null>(null);
  const [repeatWeekly, setRepeatWeekly] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState(teacherId);

  if (!day) return null;

  const scheduleDay = day;
  const dayLabel = format(scheduleDay, "EEEE, d MMMM yyyy");
  const isPastDay = scheduleDay < startOfDay(new Date());
  const showOutcomeOnCreate = isDayTodayOrPast(scheduleDay);
  const pendingByClass = new Map(
    pendingRequests.map((request) => [request.class_id, request])
  );
  const effectiveTeacherId = showTeacherPicker ? selectedTeacherId : teacherId;

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    if (!effectiveTeacherId) {
      toast.error("Please select a teacher.");
      return;
    }

    const times = buildClassTimesFromForm(formData, scheduleDay);
    if (times.error) {
      toast.error(times.error);
      return;
    }

    formData.set("teacher_id", effectiveTeacherId);
    formData.set("starts_at", times.starts_at);
    formData.set("ends_at", times.ends_at);

    const startsAt = new Date(times.starts_at);
    const endsAt = new Date(times.ends_at);
    const repeatWeeks =
      !isPastDay && repeatWeekly
        ? Math.min(52, Math.max(2, Number(formData.get("repeat_weeks") || 2)))
        : 1;

    const occurrences = buildWeeklyOccurrences(startsAt, endsAt, repeatWeeks);
    const teacherClasses = allClasses.filter(
      (classItem) => classItem.teacher_id === effectiveTeacherId
    );
    const overlapDate = findRecurringOverlap(teacherClasses, occurrences);

    if (overlapDate) {
      toast.error(
        `A class already exists on ${format(overlapDate, "d MMM yyyy")} at this time.`
      );
      return;
    }

    if (!isPastDay && repeatWeekly) {
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

  async function handleReschedule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!rescheduling) return;

    const formData = new FormData(event.currentTarget);
    const times = buildClassTimesFromForm(formData, scheduleDay);

    if (times.error) {
      toast.error(times.error);
      return;
    }

    if (
      hasOverlapOnDay(
        allClasses.filter((c) => c.teacher_id === rescheduling.teacher_id),
        new Date(times.starts_at),
        new Date(times.ends_at),
        rescheduling.id
      )
    ) {
      toast.error("This time overlaps with another class on the same day.");
      return;
    }

    formData.set("id", rescheduling.id);
    formData.set("starts_at", times.starts_at);
    formData.set("ends_at", times.ends_at);

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
                      className="space-y-3 rounded-lg border border-border/60 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="text-sm">
                          {classItem.teacher?.full_name ? (
                            <p className="font-medium text-primary/80">
                              {classItem.teacher.full_name}
                            </p>
                          ) : null}
                          <p className="font-medium">
                            {classItem.student?.full_name ?? "Student"}
                          </p>
                          <p className="text-muted-foreground">
                            {classItem.course_type?.name ?? "Class"}
                          </p>
                          <p className="text-xs">
                            {formatTimeRangeInTimezone(
                              classItem.starts_at,
                              classItem.ends_at,
                              timezone
                            )}
                          </p>
                          <p className="text-xs capitalize text-muted-foreground">
                            {classItem.outcome}
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

                      <ClassOutcomeActions
                        classItem={classItem}
                        onUpdated={() => router.refresh()}
                      />

                      {pending ? (
                        <div className="space-y-2 rounded-md border border-red-200 bg-red-50 p-3">
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
                {showTeacherPicker ? (
                  <div className="space-y-2">
                    <Label htmlFor="teacher_id">Teacher</Label>
                    <select
                      id="teacher_id"
                      value={selectedTeacherId}
                      onChange={(event) => setSelectedTeacherId(event.target.value)}
                      required
                      className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                    >
                      <option value="">Select teacher</option>
                      {teachers.map((teacher) => (
                        <option key={teacher.id} value={teacher.id}>
                          {teacher.full_name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
                <div className="space-y-2">
                  <Label htmlFor="student_id">Student</Label>
                  <select
                    id="student_id"
                    name="student_id"
                    required
                    className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  >
                    <option value="">Select student</option>
                    {students.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.full_name}
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
                    {courseTypes.map((courseType) => (
                      <option key={courseType.id} value={courseType.id}>
                        {courseType.name}
                      </option>
                    ))}
                  </select>
                </div>
                <ClassTimeFields day={scheduleDay} idPrefix="create_" />
                {showOutcomeOnCreate ? (
                  <div className="space-y-2">
                    <Label htmlFor="initial_outcome">Outcome</Label>
                    <select
                      id="initial_outcome"
                      name="initial_outcome"
                      defaultValue="scheduled"
                      className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                    >
                      <option value="scheduled">Scheduled (mark later)</option>
                      <option value="completed">Successful</option>
                      <option value="missed">Missed</option>
                    </select>
                    <p className="text-xs text-muted-foreground">
                      Successful or missed only applies if the class time has already passed.
                    </p>
                  </div>
                ) : null}
                <div className="space-y-2">
                  <Label htmlFor="material">PDF (optional)</Label>
                  <Input id="material" name="material" type="file" accept="application/pdf" />
                </div>
                {!isPastDay ? (
                <div className="space-y-3 rounded-lg border border-border/60 bg-muted/40 p-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={repeatWeekly}
                      onChange={(event) => setRepeatWeekly(event.target.checked)}
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
                ) : null}
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">
                    {repeatWeekly && !isPastDay ? "Schedule classes" : "Add class"}
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
              <p className="text-sm text-muted-foreground">
                {rescheduling.student?.full_name} · {rescheduling.course_type?.name}
              </p>
              <ClassTimeFields
                day={scheduleDay}
                defaultStartsAt={rescheduling.starts_at}
                defaultEndsAt={rescheduling.ends_at}
                idPrefix="reschedule_"
              />
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
