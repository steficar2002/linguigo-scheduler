"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import type { ScheduleClass } from "@/lib/types/database";
import {
  rescheduleClass,
  updateClassMaterial,
} from "@/app/admin/teachers/[teacherId]/schedule/actions";
import {
  buildClassTimesFromForm,
  ClassTimeFields,
} from "@/components/schedule/class-time-fields";
import { ClassOutcomeActions } from "@/components/schedule/class-outcome-actions";
import { useDisplayTimezone } from "@/components/schedule/timezone-toggle";
import { formatTimeRangeInTimezone } from "@/lib/timezone";
import { hasOverlapOnDay } from "@/lib/schedule";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ClassDetailDialogProps = {
  classItem: ScheduleClass | null;
  allClasses: ScheduleClass[];
  onClose: () => void;
};

export function ClassDetailDialog({
  classItem,
  allClasses,
  onClose,
}: ClassDetailDialogProps) {
  const router = useRouter();
  const timezone = useDisplayTimezone();
  const [mode, setMode] = useState<"view" | "reschedule" | "material">("view");
  const [pending, setPending] = useState(false);

  if (!classItem) return null;

  async function handleReschedule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const day = parseISO(classItem!.starts_at);
    const times = buildClassTimesFromForm(formData, day);

    if (times.error) {
      toast.error(times.error);
      return;
    }

    if (
      hasOverlapOnDay(
        allClasses,
        new Date(times.starts_at),
        new Date(times.ends_at),
        classItem!.id
      )
    ) {
      toast.error("This time overlaps with another class on the same day.");
      return;
    }

    formData.set("id", classItem!.id);
    formData.set("starts_at", times.starts_at);
    formData.set("ends_at", times.ends_at);

    setPending(true);
    const result = await rescheduleClass(formData);
    setPending(false);

    if (result?.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Class rescheduled.");
    setMode("view");
    onClose();
  }

  async function handleMaterial(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("class_id", classItem!.id);

    setPending(true);
    const result = await updateClassMaterial(formData);
    setPending(false);

    if (result?.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Class material updated.");
    setMode("view");
    onClose();
  }

  const day = parseISO(classItem.starts_at);

  return (
    <Dialog
      open={!!classItem}
      onOpenChange={(open) => {
        if (!open) {
          setMode("view");
          onClose();
        }
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Class details</DialogTitle>
        </DialogHeader>

        {mode === "view" ? (
          <div className="space-y-4">
            <div className="space-y-1 text-sm">
              <p>
                <span className="text-muted-foreground">Teacher:</span>{" "}
                {classItem.teacher?.full_name ?? "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Student:</span>{" "}
                {classItem.student?.full_name ?? "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Course:</span>{" "}
                {classItem.course_type?.name ?? "—"}
              </p>
              <p>
                <span className="text-muted-foreground">When:</span>{" "}
                {format(day, "EEE, d MMM yyyy")} ·{" "}
                {formatTimeRangeInTimezone(
                  classItem.starts_at,
                  classItem.ends_at,
                  timezone
                )}
              </p>
              <p>
                <span className="text-muted-foreground">Status:</span>{" "}
                <span className="capitalize">{classItem.outcome}</span>
              </p>
            </div>

            {classItem.materialUrl ? (
              <a
                href={classItem.materialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-primary hover:underline"
              >
                Open class material (PDF)
              </a>
            ) : (
              <p className="text-sm text-muted-foreground">No material uploaded.</p>
            )}

            <ClassOutcomeActions
              classItem={classItem}
              onUpdated={() => {
                router.refresh();
                onClose();
              }}
            />

            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => setMode("reschedule")}>
                Reschedule
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setMode("material")}
              >
                {classItem.material_path ? "Change material" : "Add material"}
              </Button>
              <Button size="sm" variant="outline" render={<Link href={`/admin/teachers/${classItem.teacher_id}`} />}>
                Open teacher profile
              </Button>
            </div>
          </div>
        ) : null}

        {mode === "reschedule" ? (
          <form onSubmit={handleReschedule} className="space-y-4">
            <ClassTimeFields
              day={day}
              defaultStartsAt={classItem.starts_at}
              defaultEndsAt={classItem.ends_at}
              idPrefix="detail_"
            />
            <div className="flex gap-2">
              <Button type="submit" disabled={pending} className="flex-1">
                Save reschedule
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setMode("view")}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : null}

        {mode === "material" ? (
          <form onSubmit={handleMaterial} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="material">PDF material</Label>
              <Input
                id="material"
                name="material"
                type="file"
                accept="application/pdf"
                required
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={pending} className="flex-1">
                Upload PDF
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setMode("view")}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
