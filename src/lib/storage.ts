import { createClient } from "@/lib/supabase/server";

export async function uploadClassMaterial(
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

export async function removeClassMaterial(path: string) {
  const supabase = await createClient();
  await supabase.storage.from("class-materials").remove([path]);
}

export async function uploadProfilePhoto(
  teacherId: string,
  file: File
): Promise<{ path?: string; error?: string }> {
  if (file.size === 0) {
    return {};
  }

  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowed.includes(file.type)) {
    return { error: "Only image files are allowed." };
  }

  const supabase = await createClient();
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${teacherId}/avatar.${ext}`;

  const { error } = await supabase.storage
    .from("profile-photos")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) {
    return { error: error.message };
  }

  return { path };
}

export async function removeProfilePhoto(path: string) {
  const supabase = await createClient();
  await supabase.storage.from("profile-photos").remove([path]);
}

export async function getSignedUrl(
  bucket: "class-materials" | "profile-photos",
  path: string
): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}
