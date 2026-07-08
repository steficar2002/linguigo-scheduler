"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { Student } from "@/lib/types/database";
import {
  createStudentAction,
  deleteStudentAction,
  updateStudentAction,
} from "@/app/admin/students/actions";
import { PageHeader } from "@/components/admin/page-header";
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

function StudentForm({
  student,
  onSubmit,
}: {
  student?: Student;
  onSubmit: (formData: FormData) => Promise<void>;
}) {
  return (
    <form action={onSubmit} className="space-y-4">
      {student ? <input type="hidden" name="id" value={student.id} /> : null}
      <div className="space-y-2">
        <Label htmlFor="full_name">Full name</Label>
        <Input
          id="full_name"
          name="full_name"
          defaultValue={student?.full_name}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email (optional)</Label>
        <Input
          id="email"
          name="email"
          type="email"
          defaultValue={student?.email ?? ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea id="notes" name="notes" defaultValue={student?.notes ?? ""} />
      </div>
      <Button type="submit" className="w-full">
        {student ? "Save changes" : "Add student"}
      </Button>
    </form>
  );
}

export function StudentsPanel({ students }: { students: Student[] }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);

  async function handleCreate(formData: FormData) {
    const result = await createStudentAction(formData);
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Student created.");
    setCreateOpen(false);
  }

  async function handleUpdate(formData: FormData) {
    const result = await updateStudentAction(formData);
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Student updated.");
    setEditing(null);
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
              <StudentForm onSubmit={handleCreate} />
            </DialogContent>
          </Dialog>
        }
      />

      <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground">
                  No students yet.
                </TableCell>
              </TableRow>
            ) : (
              students.map((student) => (
                <TableRow key={student.id}>
                  <TableCell>{student.full_name}</TableCell>
                  <TableCell>{student.email ?? "—"}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {student.notes ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditing(student)}
                      >
                        Edit
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

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit student</DialogTitle>
          </DialogHeader>
          {editing ? (
            <StudentForm student={editing} onSubmit={handleUpdate} />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
