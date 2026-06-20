import type { ServiceCategory } from "./overpass";

/**
 * Static, zero-cost facts — no LLM needed. Helpline numbers and typical
 * category-level hours are well-documented public facts, unlike a specific
 * business's own phone number, which genuinely requires real lookup.
 */
export const CATEGORY_HELPLINE: Record<ServiceCategory, string> = {
  hospital: "108 (ambulance) / 102 (medical helpline)",
  clinic: "108 (ambulance) / 102 (medical helpline)",
  bank: "1800-180-1111 (RBI banking helpline)",
  atm: "1800-180-1111 (RBI banking helpline)",
  school: "1800-11-8004 (national education helpline)",
  government: "1100 (AP CM helpline) / 1077 (district helpline)",
};

export const CATEGORY_TYPICAL_HOURS: Record<ServiceCategory, string> = {
  hospital: "Emergency: 24/7. OPD typically 9AM–4PM, Mon–Sat.",
  clinic: "Typically 9AM–4PM, Mon–Sat.",
  bank: "Typically 10AM–4PM Mon–Fri, 10AM–1PM Sat. Closed Sun & 2nd/4th Sat.",
  atm: "Usually 24/7.",
  school: "Typically 9AM–4PM, Mon–Sat (school days).",
  government: "Typically 10:30AM–5PM, Mon–Sat.",
};
