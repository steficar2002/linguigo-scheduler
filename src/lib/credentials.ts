const AUTH_EMAIL_DOMAIN = "linguigo.local";

export function authEmailFromUsername(username: string) {
  return `${username}@${AUTH_EMAIL_DOMAIN}`;
}

export function normalizeNameParts(fullName: string): string[] {
  const cleaned = fullName
    .toLowerCase()
    .replace(/[()]/g, " ")
    .replace(/[^a-z0-9\s.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.split(/[\s.]+/).filter(Boolean);
}

function randomDigits(n: number) {
  let out = "";
  for (let i = 0; i < n; i++) out += Math.floor(Math.random() * 10).toString();
  return out;
}

export function buildUsernameBase(fullName: string) {
  const parts = normalizeNameParts(fullName);
  if (parts.length === 0) return "user";
  return parts.join(".");
}

/** username + password, both ≥ 6 chars, different suffixes */
export function generateCredentials(fullName: string) {
  const base = buildUsernameBase(fullName);
  let username = `${base}.${randomDigits(3)}`;
  if (username.length < 6) username = `${username}${randomDigits(6 - username.length)}`;

  let password = `${base}.${randomDigits(3)}`;
  while (password === username) {
    password = `${base}.${randomDigits(3)}`;
  }
  if (password.length < 6) password = `${password}${randomDigits(6 - password.length)}`;

  return { username, password };
}

export function parseMoney(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const m = String(raw).replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
}

export function parseDurationMinutes(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const m = String(raw).match(/(\d+)\s*min/i);
  return m ? Number(m[1]) : null;
}
