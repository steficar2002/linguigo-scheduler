import { requireRole } from "@/lib/auth";
import { TeacherNav } from "@/components/teacher/teacher-nav";
import { FadeIn } from "@/components/ui/fade-in";

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole("teacher");

  return (
    <div className="flex min-h-full flex-col bg-muted/30">
      <TeacherNav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        <FadeIn>{children}</FadeIn>
      </main>
    </div>
  );
}
