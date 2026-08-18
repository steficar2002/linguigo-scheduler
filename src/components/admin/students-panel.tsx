"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import type { StudentStatus, StudentWithTeacher } from "@/lib/types/database";
import {
  createStudentAction,
  deleteStudentAction,
} from "@/app/admin/students/actions";
import { STUDENT_STATUS_LABELS } from "@/lib/student-status";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const statuses: StudentStatus[] = ["active", "paused", "atx", "ex", "refunded"];

function studentSearchHref(q: string, status?: StudentStatus) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (status) params.set("status", status);
  const query = params.toString();
  return query ? `/admin/students?${query}` : "/admin/students";
}

function formatMoney(value: number | null) {
  return value === null
    ? "—"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(value);
}

function teacherPay(student: StudentWithTeacher) {
  return student.teacher_hourly_override ?? student.teacher?.salary_per_hour ?? null;
}

function statusVariant(status: StudentStatus) {
  if (status === "refunded" || status === "ex") return "destructive";
  if (status === "paused" || status === "atx") return "secondary";
  return "default";
}

function CreateStudentForm({
  onSubmit,
}: {
  onSubmit: (formData: FormData) => Promise<void>;
}) {
  return (
    <form action={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="full_name">Full name</Label>
        <Input id="full_name" name="full_name" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email (optional)</Label>
        <Input id="email" name="email" type="email" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="classes_remaining">Classes left</Label>
        <Input
          id="classes_remaining"
          name="classes_remaining"
          type="number"
          min={0}
          step={1}
          defaultValue={0}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea id="notes" name="notes" />
      </div>
      <Button type="submit" className="w-full">
        Add student
      </Button>
    </form>
  );
}

export function StudentsPanel({
  students,
  q,
  status,
}: {
  students: StudentWithTeacher[];
  q: string;
  status?: StudentStatus;
}) {
  const [createOpen, setCreateOpen] = useState(false);

  async function handleCreate(formData: FormData) {
    const result = await createStudentAction(formData);
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Student created.");
    setCreateOpen(false);
  }

  async function handleDelete(id: string) {
    const formData = new FormData();
    formData.set("id", id);
    const result = await deleteStudentAction(formData);
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Student deleted.");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students"
        description="Manage students scheduled for classes."
        action={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger render={<Button />}>Add student</DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add student</DialogTitle>
              </DialogHeader>
              <CreateStudentForm onSubmit={handleCreate} />
            </DialogContent>
          </Dialog>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <form action="/admin/students" className="flex min-w-64 flex-1 gap-2">
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
        <div className="flex flex-wrap gap-2">
          <Button
            nativeButton={false}
            render={<Link href={studentSearchHref(q)} />}
            size="sm"
            variant={!status ? "default" : "outline"}
          >
            All
          </Button>
          {statuses.map((studentStatus) => (
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
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/60 bg-card shadow-sm">
        <Table className="min-w-[1000px]">
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Teacher</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Teacher pay</TableHead>
              <TableHead>Classes/week</TableHead>
              <TableHead>Classes left</TableHead>
              <TableHead>Alert</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-muted-foreground">
                  No students yet.
                </TableCell>
              </TableRow>
            ) : (
              students.map((student) => (
                <TableRow key={student.id}>
                  <TableCell>{student.full_name}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(student.status)}>
                      {STUDENT_STATUS_LABELS[student.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>{student.teacher?.full_name ?? "Unassigned"}</TableCell>
                  <TableCell>
                    {student.duration_minutes ? `${student.duration_minutes} min` : "—"}
                  </TableCell>
                  <TableCell>{formatMoney(student.price_paid)}</TableCell>
                  <TableCell>{formatMoney(teacherPay(student))}</TableCell>
                  <TableCell>{student.classes_per_week ?? "—"}</TableCell>
                  <TableCell>{student.classes_remaining ?? 0}</TableCell>
                  <TableCell className="max-w-48 truncate">{student.alert ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        nativeButton={false}
                        render={<Link href={`/admin/students/${student.id}`} />}
                      >
                        Profile
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(student.id)}
                      >
                        Delete
                      </Button>
                    </div>
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
