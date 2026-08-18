import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole, getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { STUDENT_STATUS_LABELS } from "@/lib/student-status";
import type { TeacherStudent } from "@/components/teacher/my-students-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type PageProps = {
  params: Promise<{ studentId: string }>;
};

type TeacherStudentDetail = TeacherStudent & {
  notes: string | null;
};

function statusVariant(status: TeacherStudentDetail["status"]) {
  if (status === "refunded" || status === "ex") return "destructive";
  if (status === "paused" || status === "atx") return "secondary";
  return "default";
}

export default async function TeacherStudentPage({ params }: PageProps) {
  await requireRole("teacher");
  const userId = await getUser();
  const { studentId } = await params;
  const supabase = await createClient();

  const { data: student } = await supabase
    .from("students")
    .select(
      "id, full_name, status, duration_minutes, classes_per_week, classes_remaining, alert, teacher_id, notes",
    )
    .eq("id", studentId)
    .eq("teacher_id", userId!)
    .single();

  if (!student) notFound();

  const studentDetail = student as TeacherStudentDetail;

  return (
    <div className="space-y-8">
      <Button
        nativeButton={false}
        render={<Link href="/teacher/students" />}
        size="sm"
        variant="ghost"
        className="w-fit"
      >
        ← Back to My Students
      </Button>

      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            {studentDetail.full_name}
          </h1>
          <Badge variant={statusVariant(studentDetail.status)}>
            {STUDENT_STATUS_LABELS[studentDetail.status]}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Student profile details.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Learning details</CardTitle>
          <CardDescription>Read-only class information.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-3">
          <div>
            <p className="text-sm text-muted-foreground">Class duration</p>
            <p className="mt-1 font-medium">
              {studentDetail.duration_minutes
                ? `${studentDetail.duration_minutes} min`
                : "Not set"}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Classes per week</p>
            <p className="mt-1 font-medium">
              {studentDetail.classes_per_week ?? "Not set"}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Classes left</p>
            <p className="mt-1 font-medium">{studentDetail.classes_remaining ?? 0}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Alert</p>
            <p className="mt-1 font-medium">{studentDetail.alert ?? "None"}</p>
          </div>
          <div className="sm:col-span-3">
            <p className="text-sm text-muted-foreground">Notes</p>
            <p className="mt-1 whitespace-pre-wrap font-medium">
              {studentDetail.notes ?? "No notes available."}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
