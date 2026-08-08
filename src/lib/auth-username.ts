import { createAdminClient } from "@/lib/supabase/admin";
import { authEmailFromUsername } from "@/lib/credentials";

export async function resolveAuthEmail(identifier: string): Promise<string | null> {
  const value = identifier.trim();
  if (!value) return null;
  if (value.includes("@")) return value.toLowerCase();

  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("email, username")
    .eq("username", value.toLowerCase())
    .maybeSingle();

  if (data?.email) return data.email;
  // Fallback if profile email missing but convention used
  return authEmailFromUsername(value.toLowerCase());
}
