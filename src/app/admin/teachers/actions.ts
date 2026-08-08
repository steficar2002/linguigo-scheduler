"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import {
  authEmailFromUsername,
  createWithUniqueCredentials,
  generateCredentials,
} from "@/lib/credentials";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { removeProfilePhoto, uploadProfilePhoto } from "@/lib/storage";

const teacherSchema = z.object({
  full_name: z.string().min(1, "Name is required"),
  salary_per_hour: z.coerce.number().min(0).optional().default(0),
});

export async function createTeacherAction(formData: FormData) {
  await requireRole("admin");

  const parsed = teacherSchema.safeParse({
    full_name: formData.get("full_name"),
    salary_per_hour: formData.get("salary_per_hour") || 0,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const admin = createAdminClient();
  const { data, error, credentials } = await createWithUniqueCredentials(
    parsed.data.full_name,
    ({ username, password }) =>
      admin.auth.admin.createUser({
        email: authEmailFromUsername(username),
        password,
        email_confirm: true,
        app_metadata: { role: "teacher" },
        user_metadata: { full_name: parsed.data.full_name },
      }),
  );

  if (error) {
    return { error: error.message };
  }

  if (data.user) {
    const { error: profileError } = await admin.from("profiles").upsert({
      id: data.user.id,
      email: authEmailFromUsername(credentials.username),
      full_name: parsed.data.full_name,
      role: "teacher",
      is_active: true,
      username: credentials.username,
      initial_password: credentials.password,
      salary_per_hour: parsed.data.salary_per_hour,
    });

    if (profileError) {
      await admin.auth.admin.deleteUser(data.user.id);
      return { error: profileError.message };
    }
  }

  revalidatePath("/admin/teachers");
  return { success: true, ...credentials };
}

export async function updateTeacherAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const full_name = String(formData.get("full_name") ?? "").trim();

  if (!id || !full_name) {
    return { error: "Teacher ID and name are required." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name })
    .eq("id", id)
    .eq("role", "teacher");

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/teachers");
  return { success: true };
}

export async function updateTeacherProfileAction(formData: FormData) {
  await requireRole("admin");

  const id = String(formData.get("id") ?? "");
  const full_name = String(formData.get("full_name") ?? "").trim();
  const salaryPerHour = Number(formData.get("salary_per_hour") ?? 0);

  if (!id || !full_name) {
    return { error: "Teacher ID and name are required." };
  }

  const supabase = await createClient();
  const { data: teacher } = await supabase
    .from("profiles")
    .select("avatar_path")
    .eq("id", id)
    .single();

  let avatar_path = teacher?.avatar_path ?? null;
  const file = formData.get("avatar") as File | null;

  if (file && file.size > 0) {
    if (avatar_path) {
      await removeProfilePhoto(avatar_path);
    }
    const upload = await uploadProfilePhoto(id, file);
    if (upload.error) return { error: upload.error };
    avatar_path = upload.path ?? null;
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name,
      salary_per_hour: Number.isFinite(salaryPerHour) ? salaryPerHour : 0,
      avatar_path,
    })
    .eq("id", id)
    .eq("role", "teacher");

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/teachers");
  revalidatePath(`/admin/teachers/${id}`);
  return { success: true };
}

export async function regenerateTeacherPasswordAction(teacherId: string) {
  await requireRole("admin");

  if (!z.string().uuid().safeParse(teacherId).success) {
    return { error: "Invalid teacher ID." };
  }

  const admin = createAdminClient();
  const { data: teacher, error: teacherError } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", teacherId)
    .eq("role", "teacher")
    .single();

  if (teacherError || !teacher) {
    return { error: teacherError?.message ?? "Teacher not found." };
  }

  const { password } = generateCredentials(teacher.full_name);
  const { error: authError } = await admin.auth.admin.updateUserById(teacherId, {
    password,
  });

  if (authError) {
    return { error: authError.message };
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({ initial_password: password })
    .eq("id", teacherId)
    .eq("role", "teacher");

  if (profileError) {
    return { error: profileError.message };
  }

  revalidatePath("/admin/teachers");
  revalidatePath(`/admin/teachers/${teacherId}`);
  return { success: true, password };
}

export async function deactivateTeacherAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");

  if (!id) {
    return { error: "Teacher ID is required." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ is_active: false })
    .eq("id", id)
    .eq("role", "teacher");

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/teachers");
  return { success: true };
}
