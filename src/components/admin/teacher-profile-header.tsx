import Image from "next/image";
import type { Profile } from "@/lib/types/database";

type TeacherProfileHeaderProps = {
  teacher: Profile;
  avatarUrl: string | null;
};

export function TeacherProfileHeader({
  teacher,
  avatarUrl,
}: TeacherProfileHeaderProps) {
  return (
    <div className="flex items-center gap-4">
      <div className="relative size-20 overflow-hidden rounded-full border border-border/60 bg-muted">
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={teacher.full_name}
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="flex size-full items-center justify-center text-2xl font-semibold text-muted-foreground">
            {(teacher.full_name || teacher.email).charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <div>
        <h1 className="text-2xl font-semibold">
          {teacher.full_name || teacher.email}
        </h1>
        <p className="text-sm text-muted-foreground">{teacher.email}</p>
        <p className="text-sm text-muted-foreground">
          ${Number(teacher.salary_per_hour).toFixed(2)} per hour
        </p>
      </div>
    </div>
  );
}
