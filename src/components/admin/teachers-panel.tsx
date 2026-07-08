"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { Profile } from "@/lib/types/database";
import {
  createTeacherAction,
  deactivateTeacherAction,
  updateTeacherAction,
} from "@/app/admin/teachers/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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

export function TeachersPanel({ teachers }: { teachers: Profile[] }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Profile | null>(null);

  async function handleCreate(formData: FormData) {
    const result = await createTeacherAction(formData);
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Teacher invited.");
    setCreateOpen(false);
  }

  async function handleUpdate(formData: FormData) {
    const result = await updateTeacherAction(formData);
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Teacher updated.");
    setEditing(null);
  }

  async function handleDeactivate(id: string) {
    const formData = new FormData();
    formData.set("id", id);
    const result = await deactivateTeacherAction(formData);
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Teacher deactivated.");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Teachers</h1>
          <p className="text-sm text-muted-foreground">
            Invite and manage teacher accounts.
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button />}>Add teacher</DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Invite teacher</DialogTitle>
            </DialogHeader>
            <form action={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full name</Label>
                <Input id="full_name" name="full_name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required />
              </div>
              <Button type="submit" className="w-full">
                Send invite
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teachers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground">
                  No teachers yet.
                </TableCell>
              </TableRow>
            ) : (
              teachers.map((teacher) => (
                <TableRow key={teacher.id}>
                  <TableCell>{teacher.full_name || "—"}</TableCell>
                  <TableCell>{teacher.email}</TableCell>
                  <TableCell>
                    <Badge variant={teacher.is_active ? "default" : "secondary"}>
                      {teacher.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditing(teacher)}
                      >
                        Edit
                      </Button>
                      {teacher.is_active ? (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeactivate(teacher.id)}
                        >
                          Deactivate
                        </Button>
                      ) : null}
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
            <DialogTitle>Edit teacher</DialogTitle>
          </DialogHeader>
          {editing ? (
            <form action={handleUpdate} className="space-y-4">
              <input type="hidden" name="id" value={editing.id} />
              <div className="space-y-2">
                <Label htmlFor="edit_full_name">Full name</Label>
                <Input
                  id="edit_full_name"
                  name="full_name"
                  defaultValue={editing.full_name}
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                Save changes
              </Button>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
