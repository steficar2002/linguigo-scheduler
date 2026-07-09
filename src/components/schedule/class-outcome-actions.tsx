"use client";

import { toast } from "sonner";
import type { ScheduleClass } from "@/lib/types/database";
import {
  markClassCompleted,
  markClassMissed,
} from "@/app/admin/teachers/[teacherId]/schedule/actions";
import { canMarkClassOutcome } from "@/lib/class-outcomes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ClassOutcomeActionsProps = {
  classItem: ScheduleClass;
  onUpdated?: () => void;
  className?: string;
};

export function ClassOutcomeActions({
  classItem,
  onUpdated,
  className,
}: ClassOutcomeActionsProps) {
  if (!canMarkClassOutcome(classItem.starts_at)) {
    return null;
  }

  async function handleCompleted() {
    const result = await markClassCompleted(classItem.id);
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Class marked as successful.");
    onUpdated?.();
  }

  async function handleMissed() {
    const result = await markClassMissed(classItem.id);
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Class marked as missed.");
    onUpdated?.();
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span className="text-xs capitalize text-muted-foreground">
        Status: {classItem.outcome}
      </span>
      {classItem.outcome !== "completed" ? (
        <Button size="sm" variant="outline" onClick={handleCompleted}>
          Mark successful
        </Button>
      ) : null}
      {classItem.outcome !== "missed" ? (
        <Button size="sm" variant="destructive" onClick={handleMissed}>
          Mark missed
        </Button>
      ) : null}
    </div>
  );
}
