"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const teacherSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(1, "Name is required"),
});

export async function createTeacherAction(formData: FormData) {
  const parsed = teacherSchema.safeParse({
    email: formData.get("email"),
    full_name: formData.get("full_name"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(
    parsed.data.email,
    {
      data: { full_name: parsed.data.full_name },
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/login`,
    }
  );

  if (error) {
    return { error: error.message };
  }

  if (data.user) {
    await admin.auth.admin.updateUserById(data.user.id, {
      app_metadata: { role: "teacher" },
      user_metadata: { full_name: parsed.data.full_name },
    });

    await admin.from("profiles").upsert({
      id: data.user.id,
      email: parsed.data.email,
      full_name: parsed.data.full_name,
      role: "teacher",
      is_active: true,
    });
  }

  revalidatePath("/admin/teachers");
  return { success: true };
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
