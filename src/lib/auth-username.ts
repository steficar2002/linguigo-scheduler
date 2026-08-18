import { authEmailFromUsername } from "@/lib/credentials";
import { createClient } from "@/lib/supabase/server";

export async function resolveAuthEmail(identifier: string): Promise<string | null> {
  const value = identifier.trim();
  if (!value) return null;
  if (value.includes("@")) return value.toLowerCase();

  const supabase = await createClient();
  const { data } = await supabase.rpc("lookup_auth_email", {
    p_username: value.toLowerCase(),
  });

  if (typeof data === "string" && data.length > 0) {
    return data;
  }

  return authEmailFromUsername(value.toLowerCase());
}
