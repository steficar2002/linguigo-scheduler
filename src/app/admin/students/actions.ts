"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const studentSchema = z.object({
  full_name: z.string().min(1, "Name is required"),
  email: z.string().email().optional().or(z.literal("")),
  notes: z.string().optional(),
});

export async function createStudentAction(formData: FormData) {
  const parsed = studentSchema.safeParse({
    full_name: formData.get("full_name"),
    email: formData.get("email"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("students").insert({
    full_name: parsed.data.full_name,
    email: parsed.data.email || null,
    notes: parsed.data.notes || null,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/students");
  return { success: true };
}

export async function updateStudentAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const parsed = studentSchema.safeParse({
    full_name: formData.get("full_name"),
    email: formData.get("email"),
    notes: formData.get("notes"),
  });

  if (!id || !parsed.success) {
    return { error: "Invalid student data." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("students")
    .update({
      full_name: parsed.data.full_name,
      email: parsed.data.email || null,
      notes: parsed.data.notes || null,
    })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/students");
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

  revalidatePath("/admin/students");
  return { success: true };
}
