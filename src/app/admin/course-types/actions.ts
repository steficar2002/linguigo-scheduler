"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const courseTypeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

export async function createCourseTypeAction(formData: FormData) {
  const parsed = courseTypeSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("course_types").insert({
    name: parsed.data.name,
    description: parsed.data.description || null,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/course-types");
  return { success: true };
}

export async function updateCourseTypeAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const parsed = courseTypeSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
  });

  if (!id || !parsed.success) {
    return { error: "Invalid course type data." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("course_types")
    .update({
      name: parsed.data.name,
      description: parsed.data.description || null,
    })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/course-types");
  return { success: true };
}

export async function deleteCourseTypeAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");

  if (!id) {
    return { error: "Course type ID is required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("course_types").delete().eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/course-types");
  return { success: true };
}
