import type { StudentStatus } from "@/lib/types/database";

export const STUDENT_STATUS_LABELS: Record<StudentStatus, string> = {
  active: "Active",
  paused: "Paused",
  atx: "ATX",
  ex: "Ex student",
  refunded: "Refunded",
};

export function mapSpreadsheetStatus(raw: string | null | undefined): StudentStatus | null {
  const s = (raw ?? "").trim().toLowerCase();
  if (!s || s === "status") return null;
  if (s === "student") return "active";
  if (s === "on a pause") return "paused";
  if (s === "atx") return "atx";
  if (s === "ex student") return "ex";
  if (s === "refunded") return "refunded";
  return null;
}
