"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { generateCredentials } from "@/lib/credentials";
import type { StudentStatus } from "@/lib/types/database";
import { createClient } from "@/lib/supabase/server";

const studentStatuses = [
  "active",
  "paused",
  "atx",
  "ex",
  "refunded",
] as const satisfies readonly StudentStatus[];

const nullableText = z.string().trim().transform((value) => value || null);
const nullableNumber = z.preprocess(
  (value) => (value === "" || value === null ? null : value),
  z.coerce.number().finite().nullable(),
);

const studentSchema = z.object({
  full_name: z.string().trim().min(1, "Name is required"),
  status: z.enum(studentStatuses),
  teacher_id: z.string().uuid().or(z.literal("")).transform((value) => value || null),
  duration_minutes: nullableNumber
    .refine(
      (value) => value === null || (Number.isInteger(value) && value > 0),
      "Duration must be a positive whole number.",
    ),
  price_paid: nullableNumber,
  teacher_hourly_override: nullableNumber,
  classes_per_week: nullableNumber.refine(
    (value) => value === null || value > 0,
    "Classes per week must be greater than zero.",
  ),
  agent_commission: nullableText,
  alert: nullableText,
  email: z.string().trim().email("Enter a valid email address.").or(z.literal("")).transform((value) => value || null),
  notes: nullableText,
});

function studentInput(formData: FormData) {
  return {
    full_name: formData.get("full_name"),
    status: formData.get("status") || "active",
    teacher_id: formData.get("teacher_id") ?? "",
    duration_minutes: formData.get("duration_minutes") ?? "",
    price_paid: formData.get("price_paid") ?? "",
    teacher_hourly_override: formData.get("teacher_hourly_override") ?? "",
    classes_per_week: formData.get("classes_per_week") ?? "",
    agent_commission: formData.get("agent_commission") ?? "",
    alert: formData.get("alert") ?? "",
    email: formData.get("email") ?? "",
    notes: formData.get("notes") ?? "",
  };
}

function revalidateStudentPaths(studentId?: string) {
  revalidatePath("/admin/students");
  if (studentId) {
    revalidatePath(`/admin/students/${studentId}`);
  }
}

export async function createStudentAction(formData: FormData) {
  const parsed = studentSchema.safeParse(studentInput(formData));

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { username, password } = generateCredentials(parsed.data.full_name);
  const supabase = await createClient();
  const { error } = await supabase.from("students").insert({
    ...parsed.data,
    username,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  revalidateStudentPaths();
  return { success: true };
}

export async function updateStudentAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const parsed = studentSchema.safeParse(studentInput(formData));

  if (!id || !parsed.success) {
    return { error: "Invalid student data." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("students")
    .update(parsed.data)
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidateStudentPaths(id);
  return { success: true };
}

export async function deleteStudentAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");

  if (!id) {
    return { error: "Student ID is required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("students").delete().eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidateStudentPaths(id);
  return { success: true };
}

export async function regenerateStudentPasswordAction(studentId: string) {
  if (!z.string().uuid().safeParse(studentId).success) {
    return { error: "Invalid student ID." };
  }

  const supabase = await createClient();
  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("full_name")
    .eq("id", studentId)
    .single();

  if (studentError || !student) {
    return { error: studentError?.message ?? "Student not found." };
  }

  const { password } = generateCredentials(student.full_name);
  const { error } = await supabase
    .from("students")
    .update({ password })
    .eq("id", studentId);

  if (error) {
    return { error: error.message };
  }

  revalidateStudentPaths(studentId);
  return { success: true, password };
}

export async function updateStudentStatusAction(
  studentId: string,
  status: StudentStatus,
) {
  if (!z.string().uuid().safeParse(studentId).success) {
    return { error: "Invalid student ID." };
  }
  if (!z.enum(studentStatuses).safeParse(status).success) {
    return { error: "Invalid student status." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("students")
    .update({ status })
    .eq("id", studentId);

  if (error) {
    return { error: error.message };
  }

  revalidateStudentPaths(studentId);
  return { success: true };
}
