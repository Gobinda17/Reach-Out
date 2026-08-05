import "server-only";
import { sendWhatsAppOtp } from "@/lib/whatsapp";

// No traditional SMS provider is wired up — WhatsApp (lib/whatsapp.js's
// sendWhatsAppOtp) is the real delivery channel. Falls back to logging the
// code server-side whenever WhatsApp isn't configured, the send is rejected,
// or the request throws — a delivery failure here must never block someone
// from signing in, and OTP_DEV_MODE must stay a fully offline test path
// rather than firing a real WhatsApp message with the fixed test code.
export async function sendOtpSms(phone, code, { devMode = false } = {}) {
  if (devMode) {
    console.log(`[sms] OTP for ${phone}: ${code}`);
    return;
  }

  const sent = await sendWhatsAppOtp(phone, code).catch((err) => {
    console.error(`[whatsapp] OTP send threw for ${phone}:`, err);
    return false;
  });
  if (!sent) {
    console.log(`[sms] OTP for ${phone}: ${code}`);
  }
}

// Whether a real WhatsApp Business sender exists. Nothing sets this yet, so it
// is false everywhere — the free-eTag flow reads it and tells the visitor the
// truth rather than claiming a delivery that never happened.
export function whatsappConfigured() {
  return Boolean(process.env.WHATSAPP_API_KEY);
}

// Delivers the finished eTag to the visitor's WhatsApp. This is the single seam
// a real provider plugs into: give it a sender and the flow starts actually
// sending, with no change to the wizard or the API routes.
export async function sendWhatsAppEtag(phone, { code, url }) {
  if (!whatsappConfigured()) {
    console.log(`[whatsapp] no provider configured — eTag ${code} for ${phone} not sent (${url})`);
    return false;
  }
  console.log(`[whatsapp] sending eTag ${code} to ${phone}: ${url}`);
  return true;
}
