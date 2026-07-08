"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { CourseType } from "@/lib/types/database";
import {
  createCourseTypeAction,
  deleteCourseTypeAction,
  updateCourseTypeAction,
} from "@/app/admin/course-types/actions";
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

function CourseTypeForm({
  courseType,
  onSubmit,
}: {
  courseType?: CourseType;
  onSubmit: (formData: FormData) => Promise<void>;
}) {
  return (
    <form action={onSubmit} className="space-y-4">
      {courseType ? <input type="hidden" name="id" value={courseType.id} /> : null}
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" defaultValue={courseType?.name} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description (optional)</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={courseType?.description ?? ""}
        />
      </div>
      <Button type="submit" className="w-full">
        {courseType ? "Save changes" : "Add course type"}
      </Button>
    </form>
  );
}

export function CourseTypesPanel({
  courseTypes,
}: {
  courseTypes: CourseType[];
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<CourseType | null>(null);

  async function handleCreate(formData: FormData) {
    const result = await createCourseTypeAction(formData);
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Course type created.");
    setCreateOpen(false);
  }

  async function handleUpdate(formData: FormData) {
    const result = await updateCourseTypeAction(formData);
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Course type updated.");
    setEditing(null);
  }

  async function handleDelete(id: string) {
    const formData = new FormData();
    formData.set("id", id);
    const result = await deleteCourseTypeAction(formData);
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Course type deleted.");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Course Types"
        description="Define the types of classes you schedule."
        action={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger render={<Button />}>Add course type</DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add course type</DialogTitle>
              </DialogHeader>
              <CourseTypeForm onSubmit={handleCreate} />
            </DialogContent>
          </Dialog>
        }
      />

      <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {courseTypes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-muted-foreground">
                  No course types yet.
                </TableCell>
              </TableRow>
            ) : (
              courseTypes.map((courseType) => (
                <TableRow key={courseType.id}>
                  <TableCell>{courseType.name}</TableCell>
                  <TableCell className="max-w-md truncate">
                    {courseType.description ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditing(courseType)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(courseType.id)}
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
            <DialogTitle>Edit course type</DialogTitle>
          </DialogHeader>
          {editing ? (
            <CourseTypeForm courseType={editing} onSubmit={handleUpdate} />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
