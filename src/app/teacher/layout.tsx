import { requireRole } from "@/lib/auth";
import { TeacherNav } from "@/components/teacher/teacher-nav";

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole("teacher");

  return (
    <div className="flex min-h-full flex-col">
      <TeacherNav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
