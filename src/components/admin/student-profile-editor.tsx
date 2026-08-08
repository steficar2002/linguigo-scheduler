"use client";

import { useState } from "react";
import Link from "next/link";
import { Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  regenerateStudentPasswordAction,
  updateStudentAction,
} from "@/app/admin/students/actions";
import { STUDENT_STATUS_LABELS } from "@/lib/student-status";
import type { Profile, Student, StudentStatus } from "@/lib/types/database";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const statuses: StudentStatus[] = ["active", "paused", "atx", "ex", "refunded"];

type StudentProfileEditorProps = {
  student: Student;
  teachers: Pick<Profile, "id" | "full_name" | "username">[];
};

function numberValue(value: number | null) {
  return value ?? "";
}

export function StudentProfileEditor({
  student,
  teachers,
}: StudentProfileEditorProps) {
  const [password, setPassword] = useState(student.password);
  const [regenerating, setRegenerating] = useState(false);

  async function copyCredential(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied.`);
    } catch {
      toast.error(`Could not copy ${label.toLowerCase()}.`);
    }
  }

  async function handleProfileUpdate(formData: FormData) {
    const result = await updateStudentAction(formData);
    if (result?.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Student profile updated.");
  }

  async function handlePasswordRegeneration() {
    setRegenerating(true);
    const result = await regenerateStudentPasswordAction(student.id);
    setRegenerating(false);

    if (result?.error) {
      toast.error(result.error);
      return;
    }

    if (result?.password) {
      setPassword(result.password);
      toast.success("Student password regenerated.");
    }
  }

  return (
    <div className="space-y-8">
      <Link href="/admin/students" className="text-sm text-primary hover:underline">
        ← Back to students
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{student.full_name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Edit roster details and credentials.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Card>
          <CardHeader>
            <CardTitle>Student profile</CardTitle>
            <CardDescription>Roster, assignment, and billing details.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={handleProfileUpdate} className="space-y-6">
              <input type="hidden" name="id" value={student.id} />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full name</Label>
                  <Input
                    id="full_name"
                    name="full_name"
                    defaultValue={student.full_name}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    name="status"
                    defaultValue={student.status}
                    className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    {statuses.map((status) => (
                      <option key={status} value={status}>
                        {STUDENT_STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="teacher_id">Assigned teacher</Label>
                  <select
                    id="teacher_id"
                    name="teacher_id"
                    defaultValue={student.teacher_id ?? ""}
                    className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <option value="">Unassigned</option>
                    {teachers.map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.full_name}
                        {teacher.username ? ` (${teacher.username})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="duration_minutes">Duration (minutes)</Label>
                  <Input
                    id="duration_minutes"
                    name="duration_minutes"
                    type="number"
                    min={1}
                    step={1}
                    defaultValue={numberValue(student.duration_minutes)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="classes_per_week">Classes per week</Label>
                  <Input
                    id="classes_per_week"
                    name="classes_per_week"
                    type="number"
                    min={0.5}
                    step={0.5}
                    defaultValue={numberValue(student.classes_per_week)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price_paid">Price paid ($)</Label>
                  <Input
                    id="price_paid"
                    name="price_paid"
                    type="number"
                    min={0}
                    step="0.01"
                    defaultValue={numberValue(student.price_paid)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="teacher_hourly_override">
                    Teacher hourly override ($)
                  </Label>
                  <Input
                    id="teacher_hourly_override"
                    name="teacher_hourly_override"
                    type="number"
                    min={0}
                    step="0.01"
                    defaultValue={numberValue(student.teacher_hourly_override)}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="agent_commission">Agent commission</Label>
                  <Input
                    id="agent_commission"
                    name="agent_commission"
                    defaultValue={student.agent_commission ?? ""}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="alert">Alert</Label>
                <Input id="alert" name="alert" defaultValue={student.alert ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={student.email ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" defaultValue={student.notes ?? ""} />
              </div>

              <Button type="submit">Save profile</Button>
            </form>
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Credentials</CardTitle>
            <CardDescription>Share these details securely with the student.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>Username</Label>
              <div className="flex gap-2">
                <Input aria-label="Username" value={student.username} readOnly />
                <Button
                  aria-label="Copy username"
                  size="icon"
                  variant="outline"
                  onClick={() => copyCredential("Username", student.username)}
                >
                  <Copy />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <div className="flex gap-2">
                <Input aria-label="Password" value={password} readOnly />
                <Button
                  aria-label="Copy password"
                  size="icon"
                  variant="outline"
                  onClick={() => copyCredential("Password", password)}
                >
                  <Copy />
                </Button>
              </div>
            </div>
            <Button
              className="w-full"
              variant="outline"
              disabled={regenerating}
              onClick={handlePasswordRegeneration}
            >
              <RefreshCw className={regenerating ? "animate-spin" : ""} />
              {regenerating ? "Regenerating…" : "Regenerate password"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
