import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  const content = readFileSync(envPath, "utf8");
  const env = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const i = trimmed.indexOf("=");
    if (i > 0) env[trimmed.slice(0, i)] = trimmed.slice(i + 1);
  }
  return env;
}

const env = loadEnv();
const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const users = [
  {
    email: "admin@linguigo.com",
    password: "admin1",
    full_name: "Admin",
    role: "admin",
  },
  {
    email: "sarah.miller@linguigo.com",
    password: "teacher123",
    full_name: "Sarah Miller",
    role: "teacher",
  },
  {
    email: "james.chen@linguigo.com",
    password: "teacher123",
    full_name: "James Chen",
    role: "teacher",
  },
  {
    email: "elena.rodriguez@linguigo.com",
    password: "teacher123",
    full_name: "Elena Rodriguez",
    role: "teacher",
  },
  {
    email: "lukica@linguigo.com",
    password: "teacher123",
    full_name: "Lukica",
    role: "teacher",
  },
];

async function seed() {
  for (const user of users) {
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", user.email)
      .maybeSingle();

    if (existing) {
      console.log(`Skip (exists): ${user.email}`);
      continue;
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      app_metadata: { role: user.role },
      user_metadata: { full_name: user.full_name },
    });

    if (error) {
      console.error(`Failed ${user.email}:`, error.message);
      continue;
    }

    await supabase.from("profiles").upsert({
      id: data.user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      is_active: true,
    });

    console.log(`Created ${user.role}: ${user.email} / ${user.password}`);
  }
}

seed().catch(console.error);
