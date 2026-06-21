// ADMIN_PHONES is a comma-separated allowlist of E.164 numbers, e.g.
// "+919876543210,+918765432109" — never exposed to the client; only ever
// checked server-side (app/api/admin/check, app/admin/(protected)/layout.tsx).
function getAdminPhones(): Set<string> {
  return new Set(
    (process.env.ADMIN_PHONES ?? "")
      .split(",")
      .map((phone) => phone.trim())
      .filter(Boolean)
  );
}

export function isAdminPhone(phone: string): boolean {
  return getAdminPhones().has(phone);
}
