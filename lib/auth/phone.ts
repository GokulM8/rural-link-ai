// Indian mobile numbers only: 10 digits, starting 6-9. Accepts input with or
// without a leading "+91", "91", or trunk "0", and any spaces/dashes.
export function normalizeIndianPhone(input: string): string | null {
  const digitsOnly = input.replace(/\D/g, "");

  let national = digitsOnly;
  if (national.length === 12 && national.startsWith("91")) {
    national = national.slice(2);
  } else if (national.length === 11 && national.startsWith("0")) {
    national = national.slice(1);
  }

  if (!/^[6-9]\d{9}$/.test(national)) return null;
  return `+91${national}`;
}

/** For display only — never log or render the full number once verified. */
export function maskPhone(phone: string): string {
  return `+91 ••••• ${phone.slice(-4)}`;
}
