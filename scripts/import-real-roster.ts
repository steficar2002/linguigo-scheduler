import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  authEmailFromUsername,
  generateCredentials,
  parseDurationMinutes,
  parseMoney,
} from "../src/lib/credentials";
import { mapSpreadsheetStatus } from "../src/lib/student-status";
import type { StudentStatus } from "../src/lib/types/database";

const ADMIN_EMAIL = "admin@linguigo.com";
const ROSTER_PATH = "real students/Students_1785399730.xlsx";

type RosterStudent = {
  fullName: string;
  status: StudentStatus;
  teacherName: string | null;
  durationMinutes: number | null;
  pricePaid: number | null;
  teacherHourlyOverride: number | null;
  classesPerWeek: number | null;
  agentCommission: string | null;
  alert: string | null;
};

type RosterParseResult = {
  students: RosterStudent[];
  skippedRows: number;
};

type Teacher = {
  fullName: string;
  salaryPerHour: number;
};

function cellString(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}

function normalizedHeader(value: unknown): string {
  return cellString(value)
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function nullableText(value: unknown): string | null {
  const text = cellString(value);
  return text || null;
}

function columnIndex(headers: unknown[], ...names: string[]): number {
  const normalized = headers.map(normalizedHeader);
  for (const name of names) {
    const index = normalized.indexOf(normalizedHeader(name));
    if (index !== -1) return index;
  }
  return -1;
}

function valueAt(row: unknown[], index: number): string | null {
  return index === -1 ? null : nullableText(row[index]);
}

export function parseRosterRows(rows: unknown[][]): RosterParseResult {
  const headerRowIndex = rows.findIndex((row) => cellString(row[0]) === "Name");
  if (headerRowIndex === -1) {
    throw new Error('Could not find the spreadsheet header row beginning with "Name".');
  }

  const headers = rows[headerRowIndex];
  const nameColumn = columnIndex(headers, "Name");
  const statusColumn = columnIndex(headers, "Status");
  const teacherColumn = columnIndex(headers, "Teacher");
  const durationColumn = columnIndex(headers, "Duration");
  const priceColumn = columnIndex(headers, "Price they pay", "Price");
  const hourlyColumn = columnIndex(headers, "Teacher's hourly", "Teacher hourly");
  const classesPerWeekColumn = columnIndex(headers, "Classes per week");
  const commissionColumn = columnIndex(headers, "Agent's Commission", "Agent Commission");
  const alertColumn = columnIndex(headers, "Alert");

  if ([nameColumn, statusColumn, teacherColumn].some((column) => column === -1)) {
    throw new Error("The spreadsheet is missing one of the required Name, Status, or Teacher columns.");
  }

  const students: RosterStudent[] = [];
  let skippedRows = 0;

  for (const row of rows.slice(headerRowIndex + 1)) {
    const fullName = valueAt(row, nameColumn);
    if (!fullName || ["name", "students", "status"].includes(fullName.toLowerCase())) {
      skippedRows += 1;
      continue;
    }

    const status = mapSpreadsheetStatus(valueAt(row, statusColumn));
    if (!status) {
      console.warn(`Skipping "${fullName}": unrecognized spreadsheet status.`);
      skippedRows += 1;
      continue;
    }

    students.push({
      fullName,
      status,
      teacherName: valueAt(row, teacherColumn),
      durationMinutes: parseDurationMinutes(valueAt(row, durationColumn)),
      pricePaid: parseMoney(valueAt(row, priceColumn)),
      teacherHourlyOverride: parseMoney(valueAt(row, hourlyColumn)),
      classesPerWeek: parseMoney(valueAt(row, classesPerWeekColumn)),
      agentCommission: valueAt(row, commissionColumn),
      alert: valueAt(row, alertColumn),
    });
  }

  return { students, skippedRows };
}

function mode(values: number[]): number {
  if (values.length === 0) return 0;
  const counts = new Map<number, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);

  return [...counts.entries()]
    .sort(([aValue, aCount], [bValue, bCount]) => bCount - aCount || aValue - bValue)[0][0];
}

export function buildTeachers(students: RosterStudent[]): Teacher[] {
  const ratesByTeacher = new Map<string, number[]>();

  for (const student of students) {
    if (!student.teacherName) continue;
    const rates = ratesByTeacher.get(student.teacherName) ?? [];
    if (student.teacherHourlyOverride !== null) rates.push(student.teacherHourlyOverride);
    ratesByTeacher.set(student.teacherName, rates);
  }

  return [...ratesByTeacher.entries()]
    .map(([fullName, rates]) => ({ fullName, salaryPerHour: mode(rates) }))
    .sort((a, b) => a.fullName.localeCompare(b.fullName));
}

function loadEnv(): Record<string, string> {
  const envPath = resolve(process.cwd(), ".env.local");
  const env: Record<string, string> = {};

  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    env[trimmed.slice(0, separator)] = trimmed.slice(separator + 1).replace(/^['"]|['"]$/g, "");
  }

  return env;
}

function requiredEnv(env: Record<string, string>, key: string): string {
  const value = env[key];
  if (!value) throw new Error(`Missing ${key} in .env.local.`);
  return value;
}

function countByStatus(students: RosterStudent[]): Record<StudentStatus, number> {
  return students.reduce(
    (counts, student) => {
      counts[student.status] += 1;
      return counts;
    },
    { active: 0, paused: 0, atx: 0, ex: 0, refunded: 0 } satisfies Record<StudentStatus, number>,
  );
}

function loadRoster(): RosterParseResult {
  const workbook = XLSX.readFile(resolve(process.cwd(), ROSTER_PATH));
  const worksheet = workbook.Sheets.students;
  if (!worksheet) throw new Error('Workbook does not contain a sheet named "students".');
  const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1, raw: false, defval: "" });
  return parseRosterRows(rows);
}

async function assertNoError(operation: PromiseLike<{ error: { message: string } | null }>, label: string) {
  const { error } = await operation;
  if (error) throw new Error(`${label}: ${error.message}`);
}

function nextUniqueCredentials(fullName: string, usernames: Set<string>) {
  for (let attempt = 0; attempt < 1000; attempt += 1) {
    const credentials = generateCredentials(fullName);
    if (!usernames.has(credentials.username)) {
      usernames.add(credentials.username);
      return credentials;
    }
  }
  throw new Error(`Could not generate a unique username for ${fullName}.`);
}

async function importRoster() {
  const dryRun = process.argv.includes("--dry-run");
  const roster = loadRoster();
  const teachers = buildTeachers(roster.students);
  const statusCounts = countByStatus(roster.students);

  console.log(`Parsed ${roster.students.length} students and ${teachers.length} teachers; skipped ${roster.skippedRows} rows.`);
  console.log("Status counts:", statusCounts);
  console.log("First teachers:", teachers.slice(0, 5));
  console.log(
    "First students:",
    roster.students.slice(0, 5).map(({ fullName, status, teacherName }) => ({ fullName, status, teacherName })),
  );

  if (dryRun) {
    console.log("Dry run complete; no Supabase writes were made.");
    return;
  }

  const env = loadEnv();
  const supabase = createClient(
    requiredEnv(env, "NEXT_PUBLIC_SUPABASE_URL"),
    requiredEnv(env, "SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  async function listAllAuthUsers() {
    const users: { id: string; email?: string }[] = [];
    for (let page = 1; ; page += 1) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw new Error(`List auth users: ${error.message}`);
      users.push(...data.users);
      if (data.users.length < 1000) return users;
    }
  }

  async function wipeDemoData() {
    const users = await listAllAuthUsers();
    const admin = users.find((user) => user.email?.toLowerCase() === ADMIN_EMAIL);
    if (!admin) {
      throw new Error(`Refusing to wipe data: ${ADMIN_EMAIL} was not found in Supabase Auth.`);
    }

    await assertNoError(supabase.from("reschedule_requests").delete().not("id", "is", null), "Delete requests");
    await assertNoError(supabase.from("class_schedule_events").delete().not("id", "is", null), "Delete schedule events");
    await assertNoError(supabase.from("classes").delete().not("id", "is", null), "Delete classes");
    await assertNoError(supabase.from("students").delete().not("id", "is", null), "Delete students");

    for (const user of users) {
      if (user.email?.toLowerCase() === ADMIN_EMAIL) continue;
      const { error } = await supabase.auth.admin.deleteUser(user.id);
      if (error) throw new Error(`Delete auth user ${user.email ?? user.id}: ${error.message}`);
    }
  }

  await wipeDemoData();
  const usernames = new Set<string>();
  const teacherIds = new Map<string, string>();

  for (const teacher of teachers) {
    const credentials = nextUniqueCredentials(teacher.fullName, usernames);
    const email = authEmailFromUsername(credentials.username);
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: credentials.password,
      email_confirm: true,
      app_metadata: { role: "teacher" },
      user_metadata: { full_name: teacher.fullName },
    });
    if (error || !data.user) throw new Error(`Create teacher ${teacher.fullName}: ${error?.message ?? "no user returned"}`);

    await assertNoError(
      supabase.from("profiles").upsert({
        id: data.user.id,
        email,
        full_name: teacher.fullName,
        role: "teacher",
        is_active: true,
        username: credentials.username,
        initial_password: credentials.password,
        salary_per_hour: teacher.salaryPerHour,
      }),
      `Update teacher profile ${teacher.fullName}`,
    );
    teacherIds.set(teacher.fullName, data.user.id);
  }

  const students = roster.students.map((student) => {
    const credentials = nextUniqueCredentials(student.fullName, usernames);
    return {
      full_name: student.fullName,
      status: student.status,
      teacher_id: student.teacherName ? teacherIds.get(student.teacherName) ?? null : null,
      duration_minutes: student.durationMinutes,
      price_paid: student.pricePaid,
      teacher_hourly_override: student.teacherHourlyOverride,
      classes_per_week: student.classesPerWeek,
      agent_commission: student.agentCommission,
      alert: student.alert,
      username: credentials.username,
      password: credentials.password,
    };
  });

  for (let offset = 0; offset < students.length; offset += 100) {
    await assertNoError(supabase.from("students").insert(students.slice(offset, offset + 100)), "Insert students");
  }

  console.log(
    `Import complete: ${teachers.length} teachers and ${students.length} students created; ${roster.skippedRows} rows skipped.`,
  );
}

const invokedAsScript =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (invokedAsScript) {
  importRoster().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
