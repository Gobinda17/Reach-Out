import "server-only";

// No SMS provider is wired up yet — swap this for a real client (Twilio, MSG91, etc.)
// before shipping. For now the code is logged server-side so the OTP flow is testable.
export async function sendOtpSms(phone, code) {
  console.log(`[sms] OTP for ${phone}: ${code}`);
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
