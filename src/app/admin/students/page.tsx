import { createClient } from "@/lib/supabase/server";
import { StudentsPanel } from "@/components/admin/students-panel";

export default async function StudentsPage() {
  const supabase = await createClient();
  const { data: students } = await supabase
    .from("students")
    .select("*")
    .order("full_name");

  return <StudentsPanel students={students ?? []} />;
}
