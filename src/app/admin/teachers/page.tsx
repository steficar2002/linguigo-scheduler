import { createClient } from "@/lib/supabase/server";
import { TeachersPanel } from "@/components/admin/teachers-panel";

export default async function TeachersPage() {
  const supabase = await createClient();
  const { data: teachers } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "teacher")
    .order("full_name");

  return <TeachersPanel teachers={teachers ?? []} />;
}
