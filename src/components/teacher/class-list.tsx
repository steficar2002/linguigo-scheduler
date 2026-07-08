"use client";

import type { ClassWithRelations } from "@/lib/types/database";
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

export type TeacherClass = ClassWithRelations & {
  materialUrl: string | null;
};

export function ClassList({ classes }: { classes: TeacherClass[] }) {
  if (classes.length === 0) {
    return (
      <p className="rounded-lg border p-6 text-sm text-muted-foreground">
        No upcoming classes scheduled.
      </p>
    );
  }

  return (
    <div className="rounded-lg border">
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
