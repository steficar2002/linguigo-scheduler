"use client";

import Link from "next/link";
import type { StudentStatus } from "@/lib/types/database";
import { STUDENT_STATUS_LABELS } from "@/lib/student-status";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type TeacherStudent = {
  id: string;
  full_name: string;
  status: StudentStatus;
  duration_minutes: number | null;
  classes_per_week: number | null;
  alert: string | null;
  teacher_id: string | null;
};

function statusVariant(status: StudentStatus) {
  if (status === "refunded" || status === "ex") return "destructive";
  if (status === "paused" || status === "atx") return "secondary";
  return "default";
}

export function MyStudentsPanel({ students }: { students: TeacherStudent[] }) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="My Students"
        description="Students assigned to you."
      />

      <div className="overflow-x-auto rounded-xl border border-border/60 bg-card shadow-sm">
        <Table className="min-w-[700px]">
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Classes/week</TableHead>
              <TableHead>Alert</TableHead>
              <TableHead className="text-right">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">
                  No students are assigned to you yet.
                </TableCell>
              </TableRow>
            ) : (
              students.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-medium">{student.full_name}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(student.status)}>
                      {STUDENT_STATUS_LABELS[student.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {student.duration_minutes ? `${student.duration_minutes} min` : "—"}
                  </TableCell>
                  <TableCell>{student.classes_per_week ?? "—"}</TableCell>
                  <TableCell className="max-w-64 truncate">
                    {student.alert ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      nativeButton={false}
                      render={<Link href={`/teacher/students/${student.id}`} />}
                      size="sm"
                      variant="outline"
                    >
                      View
                    </Button>
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
