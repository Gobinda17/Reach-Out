import "server-only";

// No SMS provider is wired up yet — swap this for a real client (Twilio, MSG91, etc.)
// before shipping. For now the code is logged server-side so the OTP flow is testable.
export async function sendOtpSms(phone, code) {
  console.log(`[sms] OTP for ${phone}: ${code}`);
}
