import { format, parseISO } from "date-fns";
import type { ClassScheduleEventWithRelations } from "@/lib/types/database";
import { formatTimeRange } from "@/lib/dates";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const eventLabels = {
  created: "Created",
  rescheduled: "Rescheduled",
  cancelled: "Cancelled",
} as const;

const eventVariants = {
  created: "default",
  rescheduled: "secondary",
  cancelled: "destructive",
} as const;

type ScheduleHistoryPanelProps = {
  events: ClassScheduleEventWithRelations[];
  title?: string;
};

export function ScheduleHistoryPanel({
  events,
  title = "Schedule history",
}: ScheduleHistoryPanelProps) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Student</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>Change</TableHead>
              <TableHead>By</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">
                  No history yet.
                </TableCell>
              </TableRow>
            ) : (
              events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="whitespace-nowrap text-xs">
                    {format(parseISO(event.created_at), "d MMM yyyy · h:mm a")}
                  </TableCell>
                  <TableCell>
                    <Badge variant={eventVariants[event.event_type]}>
                      {eventLabels[event.event_type]}
                    </Badge>
                  </TableCell>
                  <TableCell>{event.student?.full_name ?? "—"}</TableCell>
                  <TableCell>{event.course_type?.name ?? "—"}</TableCell>
                  <TableCell className="text-xs">
                    {event.event_type === "created" && event.new_starts_at ? (
                      formatTimeRange(event.new_starts_at, event.new_ends_at!)
                    ) : event.event_type === "cancelled" && event.old_starts_at ? (
                      formatTimeRange(event.old_starts_at, event.old_ends_at!)
                    ) : event.old_starts_at && event.new_starts_at ? (
                      <>
                        {formatTimeRange(event.old_starts_at, event.old_ends_at!)}
                        {" → "}
                        {formatTimeRange(event.new_starts_at, event.new_ends_at!)}
                      </>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-xs">
                    {event.changed_by_profile?.full_name ?? "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
