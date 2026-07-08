"use client";

import { useState } from "react";
import { toast } from "sonner";
import type {
  ClassWithRelations,
  CourseType,
  Profile,
  Student,
} from "@/lib/types/database";
import { toDatetimeLocalValue, formatClassTime } from "@/lib/dates";
import {
  createClassAction,
  deleteClassAction,
  updateClassAction,
} from "@/app/admin/classes/actions";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

type ClassFormProps = {
  teachers: Profile[];
  students: Student[];
  courseTypes: CourseType[];
  classItem?: ClassWithRelations;
  onSubmit: (formData: FormData) => Promise<void>;
};

function ClassForm({
  teachers,
  students,
  courseTypes,
  classItem,
  onSubmit,
}: ClassFormProps) {
  return (
    <form action={onSubmit} className="space-y-4">
      {classItem ? <input type="hidden" name="id" value={classItem.id} /> : null}
      <div className="space-y-2">
        <Label htmlFor="teacher_id">Teacher</Label>
        <select
          id="teacher_id"
          name="teacher_id"
          defaultValue={classItem?.teacher_id}
          required
          className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
        >
          <option value="">Select teacher</option>
          {teachers.map((teacher) => (
            <option key={teacher.id} value={teacher.id}>
              {teacher.full_name || teacher.email}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="student_id">Student</Label>
        <select
          id="student_id"
          name="student_id"
          defaultValue={classItem?.student_id}
          required
          className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
        >
          <option value="">Select student</option>
          {students.map((student) => (
            <option key={student.id} value={student.id}>
              {student.full_name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="course_type_id">Course type</Label>
        <select
          id="course_type_id"
          name="course_type_id"
          defaultValue={classItem?.course_type_id}
          required
          className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
        >
          <option value="">Select course type</option>
          {courseTypes.map((courseType) => (
            <option key={courseType.id} value={courseType.id}>
              {courseType.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="starts_at">Start</Label>
          <Input
            id="starts_at"
            name="starts_at"
            type="datetime-local"
            defaultValue={
              classItem ? toDatetimeLocalValue(classItem.starts_at) : undefined
            }
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ends_at">End</Label>
          <Input
            id="ends_at"
            name="ends_at"
            type="datetime-local"
            defaultValue={
              classItem ? toDatetimeLocalValue(classItem.ends_at) : undefined
            }
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="material">PDF material (optional)</Label>
        <Input id="material" name="material" type="file" accept="application/pdf" />
        {classItem?.material_path ? (
          <p className="text-xs text-muted-foreground">
            Current file: {classItem.material_path.split("/").pop()}
          </p>
        ) : null}
      </div>
      <Button type="submit" className="w-full">
        {classItem ? "Save changes" : "Schedule class"}
      </Button>
    </form>
  );
}

export function ClassesPanel({
  classes,
  teachers,
  students,
  courseTypes,
}: {
  classes: ClassWithRelations[];
  teachers: Profile[];
  students: Student[];
  courseTypes: CourseType[];
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<ClassWithRelations | null>(null);

  async function handleCreate(formData: FormData) {
    const result = await createClassAction(formData);
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Class scheduled.");
    setCreateOpen(false);
  }

  async function handleUpdate(formData: FormData) {
    const result = await updateClassAction(formData);
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Class updated.");
    setEditing(null);
  }

  async function handleDelete(id: string) {
    const formData = new FormData();
    formData.set("id", id);
    const result = await deleteClassAction(formData);
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Class deleted.");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Classes"
        description="Schedule classes and attach PDF materials."
        action={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger render={<Button />}>Schedule class</DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Schedule class</DialogTitle>
              </DialogHeader>
              <ClassForm
                teachers={teachers}
                students={students}
                courseTypes={courseTypes}
                onSubmit={handleCreate}
              />
            </DialogContent>
          </Dialog>
        }
      />

      <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Teacher</TableHead>
              <TableHead>Student</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>Material</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {classes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">
                  No classes scheduled yet.
                </TableCell>
              </TableRow>
            ) : (
              classes.map((classItem) => (
                <TableRow key={classItem.id}>
                  <TableCell className="whitespace-nowrap">
                    {formatClassTime(classItem.starts_at, classItem.ends_at)}
                  </TableCell>
                  <TableCell>{classItem.teacher?.full_name ?? "—"}</TableCell>
                  <TableCell>{classItem.student?.full_name ?? "—"}</TableCell>
                  <TableCell>{classItem.course_type?.name ?? "—"}</TableCell>
                  <TableCell>
                    {classItem.material_path ? "PDF attached" : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditing(classItem)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(classItem.id)}
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit class</DialogTitle>
          </DialogHeader>
          {editing ? (
            <ClassForm
              classItem={editing}
              teachers={teachers}
              students={students}
              courseTypes={courseTypes}
              onSubmit={handleUpdate}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
