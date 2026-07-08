import { requireRole } from "@/lib/auth";
import { AdminNav } from "@/components/admin/admin-nav";
import { FadeIn } from "@/components/ui/fade-in";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole("admin");

  return (
    <div className="flex min-h-full flex-col bg-muted/30">
      <AdminNav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        <FadeIn>{children}</FadeIn>
      </main>
    </div>
  );
}
