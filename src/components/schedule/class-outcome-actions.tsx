"use client";

import { toast } from "sonner";
import type { ClassOutcome, ScheduleClass } from "@/lib/types/database";
import { markClassOutcome } from "@/app/admin/teachers/[teacherId]/schedule/actions";
import {
  canMarkClassOutcome,
  OUTCOME_LABELS,
} from "@/lib/class-outcomes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ClassOutcomeActionsProps = {
  classItem: ScheduleClass;
  onUpdated?: () => void;
  className?: string;
};

const ACTIONS: { outcome: ClassOutcome; label: string; variant: "outline" | "secondary" | "destructive" }[] = [
  { outcome: "completed", label: "Successful", variant: "outline" },
  { outcome: "canceled_on_time", label: "Canceled on time", variant: "secondary" },
  { outcome: "late_cancel", label: "Late cancel", variant: "destructive" },
];

export function ClassOutcomeActions({
  classItem,
  onUpdated,
  className,
}: ClassOutcomeActionsProps) {
  if (!canMarkClassOutcome(classItem.starts_at)) {
    return (
      <p className="text-xs text-muted-foreground">
        Status: {OUTCOME_LABELS[classItem.outcome]}
      </p>
    );
  }

  async function handleMark(outcome: ClassOutcome) {
    const result = await markClassOutcome(classItem.id, outcome);
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    toast.success(`Class marked as ${OUTCOME_LABELS[outcome].toLowerCase()}.`);
    onUpdated?.();
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span className="text-xs text-muted-foreground">
        Status: {OUTCOME_LABELS[classItem.outcome]}
      </span>
      {ACTIONS.filter((action) => action.outcome !== classItem.outcome).map(
        (action) => (
          <Button
            key={action.outcome}
            size="sm"
            variant={action.variant}
            onClick={() => handleMark(action.outcome)}
          >
            {action.label}
          </Button>
        )
      )}
    </div>
  );
}
