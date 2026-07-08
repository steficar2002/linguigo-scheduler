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
