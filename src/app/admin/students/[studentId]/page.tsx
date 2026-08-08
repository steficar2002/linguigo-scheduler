import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StudentProfileEditor } from "@/components/admin/student-profile-editor";
import type { Profile, Student } from "@/lib/types/database";

type PageProps = {
  params: Promise<{ studentId: string }>;
};

export default async function StudentProfilePage({ params }: PageProps) {
  await requireRole("admin");
  const { studentId } = await params;
  const supabase = await createClient();

  const [{ data: student }, { data: teachers }] = await Promise.all([
    supabase.from("students").select("*").eq("id", studentId).single(),
    supabase
      .from("profiles")
      .select("id, full_name, username")
      .eq("role", "teacher")
      .order("full_name"),
  ]);

  if (!student) notFound();

  return (
    <StudentProfileEditor
      student={student as Student}
      teachers={(teachers ?? []) as Pick<Profile, "id" | "full_name" | "username">[]}
    />
  );
}
