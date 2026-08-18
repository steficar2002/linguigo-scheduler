"use server";

import { revalidatePath } from "next/cache";
import { format, startOfDay } from "date-fns";
import { z } from "zod";
import { getProfile, requireRole } from "@/lib/auth";
import { isValidDuration } from "@/lib/class-duration";
import { parseInitialOutcome } from "@/lib/class-outcomes";
import type { ClassOutcome } from "@/lib/types/database";
import { createClient } from "@/lib/supabase/server";
import { removeClassMaterial, uploadClassMaterial } from "@/lib/storage";
import {
  buildWeeklyOccurrences,
  findRecurringOverlap,
  hasOverlapOnDay,
} from "@/lib/schedule";

function formRequired(value: FormDataEntryValue | null): string {
  return value === null ? "" : String(value);
}

function formOptional(value: FormDataEntryValue | null): string | undefined {
  return value === null ? undefined : String(value);
}

const classTimesSchema = z
  .object({
    teacher_id: z.string().uuid(),
    student_id: z.string().uuid(),
    course_type_id: z.string().uuid(),
    starts_at: z.string().min(1),
    ends_at: z.string().min(1),
    duration_minutes: z.coerce.number().optional(),
    repeat_enabled: z.string().optional(),
    repeat_weeks: z.coerce.number().int().min(1).max(52).optional(),
  })
  .refine((data) => new Date(data.ends_at) > new Date(data.starts_at), {
    message: "End time must be after start time.",
    path: ["ends_at"],
  })
  .refine(
    (data) =>
      data.duration_minutes === undefined ||
      isValidDuration(data.duration_minutes),
    {
      message: "Invalid class duration.",
      path: ["duration_minutes"],
    }
  );

const rescheduleSchema = z
  .object({
    id: z.string().uuid(),
    starts_at: z.string().min(1),
    ends_at: z.string().min(1),
    duration_minutes: z.coerce.number().optional(),
  })
  .refine((data) => new Date(data.ends_at) > new Date(data.starts_at), {
    message: "End time must be after start time.",
    path: ["ends_at"],
  });

function revalidateSchedulePaths(teacherId: string) {
  revalidatePath(`/admin/teachers/${teacherId}`);
  revalidatePath(`/admin/teachers/${teacherId}/schedule`);
  revalidatePath("/teacher/schedule");
  revalidatePath("/admin/teachers");
  revalidatePath("/admin/students");
}

async function requireScheduler() {
  const profile = await getProfile();
  if (!profile || !profile.is_active) {
    return { error: "Unauthorized" as const, profile: null };
  }
  if (profile.role !== "admin" && profile.role !== "teacher") {
    return { error: "Unauthorized" as const, profile: null };
  }
  return { profile };
}

async function applyClassesRemainingDelta(
  supabase: Awaited<ReturnType<typeof createClient>>,
  studentId: string,
  delta: number
) {
  if (delta === 0) return;
  const { data: student } = await supabase
    .from("students")
    .select("classes_remaining")
    .eq("id", studentId)
    .single();
  if (!student) return;
  const next = Math.max(0, (student.classes_remaining ?? 0) + delta);
  await supabase
    .from("students")
    .update({ classes_remaining: next })
    .eq("id", studentId);
}

async function logEvent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  payload: {
    class_id?: string | null;
    teacher_id: string;
    event_type: "created" | "rescheduled" | "cancelled";
    student_id?: string | null;
    course_type_id?: string | null;
    old_starts_at?: string | null;
    old_ends_at?: string | null;
    new_starts_at?: string | null;
    new_ends_at?: string | null;
    changed_by: string;
    note?: string | null;
  }
) {
  await supabase.from("class_schedule_events").insert(payload);
}

export async function createScheduledClass(formData: FormData) {
  const auth = await requireScheduler();
  if (!auth.profile) return { error: auth.error };

  const parsed = classTimesSchema.safeParse({
    teacher_id: formRequired(formData.get("teacher_id")),
    student_id: formRequired(formData.get("student_id")),
    course_type_id: formRequired(formData.get("course_type_id")),
    starts_at: formRequired(formData.get("starts_at")),
    ends_at: formRequired(formData.get("ends_at")),
    duration_minutes: formData.get("duration_minutes") ?? undefined,
    repeat_enabled: formOptional(formData.get("repeat_enabled")),
    repeat_weeks: formData.get("repeat_weeks") ?? undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error?.issues[0]?.message ?? "Invalid input" };
  }

  if (
    auth.profile.role === "teacher" &&
    parsed.data.teacher_id !== auth.profile.id
  ) {
    return { error: "You can only add classes for yourself." };
  }

  const repeatEnabled = parsed.data.repeat_enabled === "true";
  const baseStart = new Date(parsed.data.starts_at);

  if (repeatEnabled && baseStart < startOfDay(new Date())) {
    return { error: "Cannot create recurring classes on past days." };
  }

  const totalWeeks = repeatEnabled
    ? Math.min(52, Math.max(2, parsed.data.repeat_weeks ?? 2))
    : 1;

  const supabase = await createClient();
  const baseEnd = new Date(parsed.data.ends_at);
  const occurrences = buildWeeklyOccurrences(baseStart, baseEnd, totalWeeks);

  const rangeStart = occurrences[0].startsAt.toISOString();
  const rangeEnd = occurrences[occurrences.length - 1].endsAt.toISOString();

  const { data: existingClasses } = await supabase
    .from("classes")
    .select("id, starts_at, ends_at")
    .eq("teacher_id", parsed.data.teacher_id)
    .gte("starts_at", rangeStart)
    .lte("starts_at", rangeEnd);

  const overlapDate = findRecurringOverlap(existingClasses ?? [], occurrences);
  if (overlapDate) {
    return {
      error: `A class already exists on ${format(overlapDate, "d MMM yyyy")} at this time.`,
    };
  }

  const rows = occurrences.map((occurrence) => {
    const endsAt = occurrence.endsAt.toISOString();
    return {
      teacher_id: parsed.data.teacher_id,
      student_id: parsed.data.student_id,
      course_type_id: parsed.data.course_type_id,
      starts_at: occurrence.startsAt.toISOString(),
      ends_at: endsAt,
      outcome: parseInitialOutcome(formData.get("initial_outcome"), endsAt),
    };
  });

  const { data: created, error } = await supabase
    .from("classes")
    .insert(rows)
    .select("id");

  if (error || !created?.length) {
    return { error: error?.message ?? "Failed to create class." };
  }

  const file = formData.get("material") as File | null;
  if (file && file.size > 0) {
    const upload = await uploadClassMaterial(created[0].id, file);
    if (upload.error) return { error: upload.error };
    if (upload.path) {
      await supabase
        .from("classes")
        .update({ material_path: upload.path })
        .eq("id", created[0].id);
    }
  }

  const completedCount = rows.filter((row) => row.outcome === "completed").length;
  if (completedCount > 0) {
    await applyClassesRemainingDelta(
      supabase,
      parsed.data.student_id,
      -completedCount
    );
  }

  const bulkNote =
    totalWeeks > 1 ? `Recurring series of ${totalWeeks} weekly classes` : null;

  await Promise.all(
    created.map((classRow, index) =>
      logEvent(supabase, {
        class_id: classRow.id,
        teacher_id: parsed.data.teacher_id,
        event_type: "created",
        student_id: parsed.data.student_id,
        course_type_id: parsed.data.course_type_id,
        new_starts_at: rows[index].starts_at,
        new_ends_at: rows[index].ends_at,
        changed_by: auth.profile.id,
        note: bulkNote,
      })
    )
  );

  revalidateSchedulePaths(parsed.data.teacher_id);
  return { success: true, count: created.length };
}

export async function deleteScheduledClass(classId: string) {
  await requireRole("admin");
  const admin = await getProfile();
  if (!admin) return { error: "Unauthorized" };

  const supabase = await createClient();
  const { data: classRow } = await supabase
    .from("classes")
    .select("*")
    .eq("id", classId)
    .single();

  if (!classRow) return { error: "Class not found." };

  const { error } = await supabase.from("classes").delete().eq("id", classId);
  if (error) return { error: error.message };

  if (classRow.material_path) {
    await removeClassMaterial(classRow.material_path);
  }

  await logEvent(supabase, {
    class_id: classId,
    teacher_id: classRow.teacher_id,
    event_type: "cancelled",
    student_id: classRow.student_id,
    course_type_id: classRow.course_type_id,
    old_starts_at: classRow.starts_at,
    old_ends_at: classRow.ends_at,
    changed_by: admin.id,
  });

  revalidateSchedulePaths(classRow.teacher_id);
  return { success: true };
}

export async function rescheduleClass(formData: FormData) {
  await requireRole("admin");
  const admin = await getProfile();
  if (!admin) return { error: "Unauthorized" };

  const parsed = rescheduleSchema.safeParse({
    id: formRequired(formData.get("id")),
    starts_at: formRequired(formData.get("starts_at")),
    ends_at: formRequired(formData.get("ends_at")),
    duration_minutes: formData.get("duration_minutes") ?? undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { data: classRow } = await supabase
    .from("classes")
    .select("*")
    .eq("id", parsed.data.id)
    .single();

  if (!classRow) return { error: "Class not found." };

  const newStartsAt = new Date(parsed.data.starts_at).toISOString();
  const newEndsAt = new Date(parsed.data.ends_at).toISOString();

  const { data: teacherClasses } = await supabase
    .from("classes")
    .select("id, starts_at, ends_at")
    .eq("teacher_id", classRow.teacher_id);

  if (
    hasOverlapOnDay(
      teacherClasses ?? [],
      new Date(newStartsAt),
      new Date(newEndsAt),
      classRow.id
    )
  ) {
    return { error: "This time overlaps with another class on the same day." };
  }

  const { error } = await supabase
    .from("classes")
    .update({ starts_at: newStartsAt, ends_at: newEndsAt })
    .eq("id", parsed.data.id);

  if (error) return { error: error.message };

  await logEvent(supabase, {
    class_id: classRow.id,
    teacher_id: classRow.teacher_id,
    event_type: "rescheduled",
    student_id: classRow.student_id,
    course_type_id: classRow.course_type_id,
    old_starts_at: classRow.starts_at,
    old_ends_at: classRow.ends_at,
    new_starts_at: newStartsAt,
    new_ends_at: newEndsAt,
    changed_by: admin.id,
  });

  revalidateSchedulePaths(classRow.teacher_id);
  return { success: true };
}

export async function updateClassMaterial(formData: FormData) {
  await requireRole("admin");
  const classId = String(formData.get("class_id") ?? "");
  if (!classId) return { error: "Class ID is required." };

  const file = formData.get("material") as File | null;
  if (!file || file.size === 0) {
    return { error: "Please choose a PDF file." };
  }

  const supabase = await createClient();
  const { data: classRow } = await supabase
    .from("classes")
    .select("teacher_id, material_path")
    .eq("id", classId)
    .single();

  if (!classRow) return { error: "Class not found." };

  if (classRow.material_path) {
    await removeClassMaterial(classRow.material_path);
  }

  const upload = await uploadClassMaterial(classId, file);
  if (upload.error) return { error: upload.error };

  const { error } = await supabase
    .from("classes")
    .update({ material_path: upload.path ?? null })
    .eq("id", classId);

  if (error) return { error: error.message };

  revalidateSchedulePaths(classRow.teacher_id);
  return { success: true };
}

export async function markClassOutcome(
  classId: string,
  outcome: ClassOutcome
) {
  const auth = await requireScheduler();
  if (!auth.profile) return { error: auth.error };

  if (
    outcome !== "completed" &&
    outcome !== "canceled_on_time" &&
    outcome !== "late_cancel"
  ) {
    return { error: "Invalid outcome." };
  }

  const supabase = await createClient();
  const { data: classRow } = await supabase
    .from("classes")
    .select("teacher_id, student_id, starts_at, outcome")
    .eq("id", classId)
    .single();

  if (!classRow) return { error: "Class not found." };

  if (
    auth.profile.role === "teacher" &&
    classRow.teacher_id !== auth.profile.id
  ) {
    return { error: "You can only mark your own classes." };
  }

  if (new Date(classRow.starts_at) > new Date()) {
    return { error: "Only classes that have started can be marked." };
  }

  const previous = classRow.outcome as ClassOutcome;
  const { error } = await supabase
    .from("classes")
    .update({ outcome })
    .eq("id", classId);

  if (error) return { error: error.message };

  const wasSuccessful = previous === "completed";
  const isSuccessful = outcome === "completed";
  if (wasSuccessful !== isSuccessful) {
    await applyClassesRemainingDelta(
      supabase,
      classRow.student_id,
      isSuccessful ? -1 : 1
    );
  }

  revalidateSchedulePaths(classRow.teacher_id);
  return { success: true };
}

export async function markClassCompleted(classId: string) {
  return markClassOutcome(classId, "completed");
}

export async function markClassMissed(classId: string) {
  return markClassOutcome(classId, "canceled_on_time");
}

export async function approveRescheduleRequest(requestId: string) {
  await requireRole("admin");
  const admin = await getProfile();
  if (!admin) return { error: "Unauthorized" };

  const supabase = await createClient();
  const { data: request } = await supabase
    .from("reschedule_requests")
    .select("*, class:classes(*)")
    .eq("id", requestId)
    .eq("status", "pending")
    .single();

  if (!request) return { error: "Request not found." };

  const classRow = request.class;
  if (!classRow) return { error: "Class not found." };

  const newStartsAt = request.requested_starts_at
    ? new Date(request.requested_starts_at).toISOString()
    : classRow.starts_at;
  const newEndsAt = request.requested_ends_at
    ? new Date(request.requested_ends_at).toISOString()
    : classRow.ends_at;

  if (request.requested_starts_at && request.requested_ends_at) {
    const { data: teacherClasses } = await supabase
      .from("classes")
      .select("id, starts_at, ends_at")
      .eq("teacher_id", classRow.teacher_id);

    if (
      hasOverlapOnDay(
        teacherClasses ?? [],
        new Date(newStartsAt),
        new Date(newEndsAt),
        classRow.id
      )
    ) {
      return { error: "Requested time overlaps with another class." };
    }

    const { error: classError } = await supabase
      .from("classes")
      .update({ starts_at: newStartsAt, ends_at: newEndsAt })
      .eq("id", classRow.id);

    if (classError) return { error: classError.message };
  }

  const { error } = await supabase
    .from("reschedule_requests")
    .update({
      status: "approved",
      resolved_at: new Date().toISOString(),
      resolved_by: admin.id,
    })
    .eq("id", requestId);

  if (error) return { error: error.message };

  await logEvent(supabase, {
    class_id: classRow.id,
    teacher_id: classRow.teacher_id,
    event_type: "rescheduled",
    student_id: classRow.student_id,
    course_type_id: classRow.course_type_id,
    old_starts_at: classRow.starts_at,
    old_ends_at: classRow.ends_at,
    new_starts_at: newStartsAt,
    new_ends_at: newEndsAt,
    changed_by: admin.id,
    note: "Reschedule request approved by admin",
  });

  revalidateSchedulePaths(request.teacher_id);
  return { success: true };
}

export async function denyRescheduleRequest(requestId: string) {
  await requireRole("admin");
  const admin = await getProfile();
  if (!admin) return { error: "Unauthorized" };

  const supabase = await createClient();
  const { data: request } = await supabase
    .from("reschedule_requests")
    .select("*, class:classes(*)")
    .eq("id", requestId)
    .eq("status", "pending")
    .single();

  if (!request) return { error: "Request not found." };

  const { error } = await supabase
    .from("reschedule_requests")
    .update({
      status: "denied",
      resolved_at: new Date().toISOString(),
      resolved_by: admin.id,
    })
    .eq("id", requestId);

  if (error) return { error: error.message };

  const classRow = request.class;
  if (classRow) {
    await logEvent(supabase, {
      class_id: classRow.id,
      teacher_id: classRow.teacher_id,
      event_type: "rescheduled",
      student_id: classRow.student_id,
      course_type_id: classRow.course_type_id,
      old_starts_at: classRow.starts_at,
      old_ends_at: classRow.ends_at,
      changed_by: admin.id,
      note: "Reschedule request denied by admin",
    });
  }

  revalidateSchedulePaths(request.teacher_id);
  return { success: true };
}
