"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getProfile, requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { hasOverlapOnDay } from "@/lib/schedule";

function revalidateAll(teacherId: string) {
  revalidatePath("/teacher/schedule");
  revalidatePath("/admin/teachers");
  revalidatePath(`/admin/teachers/${teacherId}/schedule`);
}

const requestSchema = z
  .object({
    class_id: z.string().uuid(),
    requested_starts_at: z.string().min(1),
    requested_ends_at: z.string().min(1),
  })
  .refine(
    (data) => new Date(data.requested_ends_at) > new Date(data.requested_starts_at),
    { message: "End time must be after start time.", path: ["requested_ends_at"] }
  );

export async function requestReschedule(formData: FormData) {
  await requireRole("teacher");
  const teacher = await getProfile();
  if (!teacher) return { error: "Unauthorized" };

  const parsed = requestSchema.safeParse({
    class_id: formData.get("class_id"),
    requested_starts_at: formData.get("requested_starts_at"),
    requested_ends_at: formData.get("requested_ends_at"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const requestedStartsAt = new Date(parsed.data.requested_starts_at);
  const requestedEndsAt = new Date(parsed.data.requested_ends_at);

  if (requestedStartsAt <= new Date()) {
    return { error: "Requested time must be in the future." };
  }

  const supabase = await createClient();

  const { data: classRow } = await supabase
    .from("classes")
    .select("id, teacher_id, starts_at, ends_at")
    .eq("id", parsed.data.class_id)
    .eq("teacher_id", teacher.id)
    .single();

  if (!classRow) return { error: "Class not found." };

  const { data: existing } = await supabase
    .from("reschedule_requests")
    .select("id")
    .eq("class_id", parsed.data.class_id)
    .eq("status", "pending")
    .maybeSingle();

  if (existing) return { error: "A reschedule request is already pending." };

  const { data: teacherClasses } = await supabase
    .from("classes")
    .select("id, starts_at, ends_at")
    .eq("teacher_id", teacher.id);

  if (
    hasOverlapOnDay(
      teacherClasses ?? [],
      requestedStartsAt,
      requestedEndsAt,
      parsed.data.class_id
    )
  ) {
    return { error: "You already have a class at that time." };
  }

  const { error } = await supabase.from("reschedule_requests").insert({
    class_id: parsed.data.class_id,
    teacher_id: teacher.id,
    status: "pending",
    requested_starts_at: requestedStartsAt.toISOString(),
    requested_ends_at: requestedEndsAt.toISOString(),
  });

  if (error) return { error: error.message };

  revalidateAll(teacher.id);
  return { success: true };
}
