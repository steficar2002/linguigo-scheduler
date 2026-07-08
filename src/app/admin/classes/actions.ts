"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { removeClassMaterial, uploadClassMaterial } from "@/lib/storage";

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
    const upload = await uploadClassMaterial(created.id, file);
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
  revalidatePath(`/admin/teachers/${parsed.data.teacher_id}/schedule`);
  revalidatePath("/teacher/schedule");
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
    const upload = await uploadClassMaterial(id, file);
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
  revalidatePath(`/admin/teachers/${parsed.data.teacher_id}/schedule`);
  revalidatePath("/teacher/schedule");
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
    .select("material_path, teacher_id")
    .eq("id", id)
    .single();

  const { error } = await supabase.from("classes").delete().eq("id", id);

  if (error) {
    return { error: error.message };
  }

  if (classRow?.material_path) {
    await removeClassMaterial(classRow.material_path);
  }

  revalidatePath("/admin/classes");
  if (classRow?.teacher_id) {
    revalidatePath(`/admin/teachers/${classRow.teacher_id}/schedule`);
  }
  revalidatePath("/teacher/schedule");
  return { success: true };
}
