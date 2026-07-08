"use client";

import type { ScheduleClass } from "@/lib/types/database";
import { formatClassTime } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function ClassList({ classes }: { classes: ScheduleClass[] }) {
  if (classes.length === 0) {
    return (
      <p className="rounded-xl border border-border/60 bg-card p-8 text-center text-sm text-muted-foreground shadow-sm">
        No upcoming classes scheduled.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Student</TableHead>
            <TableHead>Course</TableHead>
            <TableHead>Time</TableHead>
            <TableHead>Material</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {classes.map((classItem) => (
            <TableRow key={classItem.id}>
              <TableCell>{classItem.student?.full_name ?? "—"}</TableCell>
              <TableCell>{classItem.course_type?.name ?? "—"}</TableCell>
              <TableCell className="whitespace-nowrap">
                {formatClassTime(classItem.starts_at, classItem.ends_at)}
              </TableCell>
              <TableCell>
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
                    Open PDF
                  </Button>
                ) : (
                  "—"
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
