import { logoutAction } from "@/app/(auth)/login/actions";
import { Button } from "@/components/ui/button";

export function TeacherNav() {
  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <div>
          <p className="font-semibold">Linguigo Scheduler</p>
          <p className="text-sm text-muted-foreground">Your upcoming classes</p>
        </div>
        <form action={logoutAction}>
          <Button type="submit" variant="outline" size="sm">
            Sign out
          </Button>
        </form>
      </div>
    </header>
  );
}
