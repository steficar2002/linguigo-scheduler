"use client";

import Link from "next/link";
import type { StudentStatus } from "@/lib/types/database";
import { STUDENT_STATUS_LABELS } from "@/lib/student-status";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  username?: string;
};

function studentSearchHref(q: string, status?: StudentStatus) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (status) params.set("status", status);
  const query = params.toString();
  return query ? `/teacher/students?${query}` : "/teacher/students";
}

function statusVariant(status: StudentStatus) {
  if (status === "refunded" || status === "ex") return "destructive";
  if (status === "paused" || status === "atx") return "secondary";
  return "default";
}

export function MyStudentsPanel({
  students,
  q,
  status,
  availableStatuses,
}: {
  students: TeacherStudent[];
  q: string;
  status?: StudentStatus;
  availableStatuses: StudentStatus[];
}) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="My Students"
        description="Students assigned to you."
      />

      <div className="flex flex-wrap items-center gap-2">
        <form action="/teacher/students" className="flex min-w-64 flex-1 gap-2">
          {status ? <input type="hidden" name="status" value={status} /> : null}
          <Input
            aria-label="Search students"
            defaultValue={q}
            name="q"
            placeholder="Search name or username"
          />
          <Button type="submit" variant="outline">
            Search
          </Button>
        </form>
        {availableStatuses.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            <Button
              nativeButton={false}
              render={<Link href={studentSearchHref(q)} />}
              size="sm"
              variant={!status ? "default" : "outline"}
            >
              All
            </Button>
            {availableStatuses.map((studentStatus) => (
              <Button
                key={studentStatus}
                nativeButton={false}
                render={<Link href={studentSearchHref(q, studentStatus)} />}
                size="sm"
                variant={status === studentStatus ? "default" : "outline"}
              >
                {STUDENT_STATUS_LABELS[studentStatus]}
              </Button>
            ))}
          </div>
        ) : null}
      </div>

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
                  No students match your filters.
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
                    {student.duration_minutes
                      ? `${student.duration_minutes} min`
                      : "—"}
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
