"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const classSchema = z
  .object({
    teacher_id: z.string().uuid(),
    student_id: z.string().uuid(),
    course_type_id: z.string().uuid(),
    starts_at: z.string().min(1),
    ends_at: z.string().min(1),
  })
  .refine((data) => new Date(data.ends_at) > new Date(data.starts_at), {
    message: "End time must be after start time.",
    path: ["ends_at"],
  });

async function uploadMaterial(
  classId: string,
  file: File
): Promise<{ path?: string; error?: string }> {
  if (file.size === 0) {
    return {};
  }

  if (file.type !== "application/pdf") {
    return { error: "Only PDF files are allowed." };
  }

  const supabase = await createClient();
  const path = `${classId}/${file.name}`;

  const { error } = await supabase.storage
    .from("class-materials")
    .upload(path, file, { upsert: true, contentType: "application/pdf" });

  if (error) {
    return { error: error.message };
  }

  return { path };
}

export async function createClassAction(formData: FormData) {
  const parsed = classSchema.safeParse({
    teacher_id: formData.get("teacher_id"),
    student_id: formData.get("student_id"),
    course_type_id: formData.get("course_type_id"),
    starts_at: formData.get("starts_at"),
    ends_at: formData.get("ends_at"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { data: created, error } = await supabase
    .from("classes")
    .insert({
      teacher_id: parsed.data.teacher_id,
      student_id: parsed.data.student_id,
      course_type_id: parsed.data.course_type_id,
      starts_at: new Date(parsed.data.starts_at).toISOString(),
      ends_at: new Date(parsed.data.ends_at).toISOString(),
    })
    .select("id")
    .single();

  if (error || !created) {
    return { error: error?.message ?? "Failed to create class." };
  }

  const file = formData.get("material") as File | null;
  if (file && file.size > 0) {
    const upload = await uploadMaterial(created.id, file);
    if (upload.error) {
      return { error: upload.error };
    }
    if (upload.path) {
      await supabase
        .from("classes")
        .update({ material_path: upload.path })
        .eq("id", created.id);
    }
  }

  revalidatePath("/admin/classes");
  return { success: true };
}

export async function updateClassAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const parsed = classSchema.safeParse({
    teacher_id: formData.get("teacher_id"),
    student_id: formData.get("student_id"),
    course_type_id: formData.get("course_type_id"),
    starts_at: formData.get("starts_at"),
    ends_at: formData.get("ends_at"),
  });

  if (!id || !parsed.success) {
    return {
      error: parsed.success
        ? "Invalid class data."
        : (parsed.error.issues[0]?.message ?? "Invalid class data."),
    };
  }

  const supabase = await createClient();
  const updates: Record<string, string> = {
    teacher_id: parsed.data.teacher_id,
    student_id: parsed.data.student_id,
    course_type_id: parsed.data.course_type_id,
    starts_at: new Date(parsed.data.starts_at).toISOString(),
    ends_at: new Date(parsed.data.ends_at).toISOString(),
  };

  const file = formData.get("material") as File | null;
  if (file && file.size > 0) {
    const upload = await uploadMaterial(id, file);
    if (upload.error) {
      return { error: upload.error };
    }
    if (upload.path) {
      updates.material_path = upload.path;
    }
  }

  const { error } = await supabase.from("classes").update(updates).eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/classes");
  return { success: true };
}

export async function deleteClassAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");

  if (!id) {
    return { error: "Class ID is required." };
  }

  const supabase = await createClient();
  const { data: classRow } = await supabase
    .from("classes")
    .select("material_path")
    .eq("id", id)
    .single();

  const { error } = await supabase.from("classes").delete().eq("id", id);

  if (error) {
    return { error: error.message };
  }

  if (classRow?.material_path) {
    await supabase.storage
      .from("class-materials")
      .remove([classRow.material_path]);
  }

  revalidatePath("/admin/classes");
  return { success: true };
}
