/**
 * No real SMS provider is wired up yet — this just logs the code so the full
 * login flow (request -> verify -> session) works end-to-end in development.
 * Swap this function's body for a real provider call (e.g. MSG91, Twilio)
 * once one is configured and DLT-registered for Indian numbers; every caller
 * already awaits this as fire-and-forget, so no other code needs to change.
 */
export async function sendOtpSms(phone: string, code: string): Promise<void> {
  console.log(`[OTP] ${phone}: ${code}`);
}
