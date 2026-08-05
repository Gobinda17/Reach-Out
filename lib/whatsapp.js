import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { getSetting } from "@/lib/settings";

const GRAPH_VERSION = "v20.0";

async function accessToken() {
  return getSetting("WHATSAPP_ACCESS_TOKEN", process.env.WHATSAPP_ACCESS_TOKEN);
}

async function phoneNumberId() {
  return getSetting("WHATSAPP_PHONE_NUMBER_ID", process.env.WHATSAPP_PHONE_NUMBER_ID);
}

async function templateLang() {
  return (
    (await getSetting("WHATSAPP_TEMPLATE_LANG", process.env.WHATSAPP_TEMPLATE_LANG)) || "en_US"
  );
}

export async function whatsappNotifyConfigured() {
  return Boolean((await accessToken()) && (await phoneNumberId()));
}

// Settings key each reason's approved template name is read from — e.g.
// "no-parking" -> WHATSAPP_TEMPLATE_NO_PARKING. `null` (a freely typed
// message with no preset reason picked) maps to WHATSAPP_TEMPLATE_CUSTOM.
function templateSettingKey(reasonKey) {
  const slug = (reasonKey ?? "custom").toUpperCase().replace(/-/g, "_");
  return `WHATSAPP_TEMPLATE_${slug}`;
}

async function templateNameFor(reasonKey) {
  const settingKey = templateSettingKey(reasonKey);
  const slug = (reasonKey ?? "custom").replace(/-/g, "_");
  return (await getSetting(settingKey, process.env[settingKey])) || `reachout_notify_${slug}`;
}

// Notifies a tag's owner over WhatsApp that someone scanned their tag and
// left a message. Business-initiated messages outside a 24h customer-service
// window can only ever be a pre-approved template (no free text), which is
// why this looks up a template *name* per reason rather than relaying
// `message` verbatim — the template's own approved body carries the wording,
// and the tag code + message are the only two variables. Best-effort: a
// failure here must never fail the scan-message request, since the message
// itself is already saved and visible on the owner's dashboard regardless.
export async function sendScanNotification({ to, reasonKey, tagCode, message }) {
  if (!(await whatsappNotifyConfigured())) {
    console.warn("[whatsapp] not configured — set access token + phone number ID in /admin/settings");
    return false;
  }

  const token = await accessToken();
  const phoneId = await phoneNumberId();
  const language = await templateLang();
  const template = await templateNameFor(reasonKey);
  console.log(`[whatsapp] sending template "${template}" (${language}) to ${to}`);

  const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: to.replace(/^\+/, ""),
      type: "template",
      template: {
        name: template,
        language: { code: language },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: tagCode },
              { type: "text", text: message },
            ],
          },
        ],
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[whatsapp] send failed for template "${template}" (${res.status}): ${body}`);
    return false;
  }
  const result = await res.json().catch(() => null);
  console.log(`[whatsapp] sent — message id ${result?.messages?.[0]?.id ?? "unknown"}`);
  return true;
}

// Meta's webhook verification handshake (GET /api/webhooks/whatsapp),
// triggered once when you save the Callback URL + Verify token in the app
// dashboard's "Configure Webhooks" screen. The verify token is a string you
// choose yourself, not a secret Meta hands you.
export async function verifyWhatsAppChallenge({ mode, token, challenge }) {
  const expected = await getSetting("WHATSAPP_VERIFY_TOKEN", process.env.WHATSAPP_VERIFY_TOKEN);
  if (mode !== "subscribe" || !expected || token !== expected) return null;
  return challenge;
}

// Meta signs webhook POST bodies as `X-Hub-Signature-256: sha256=<hmac>`
// using the app secret (App Dashboard > App Settings > Basic) — separate
// from the access token used to send messages. Same optional-secret
// tradeoff as edesy's webhook (lib/calling.js): unset means "don't verify",
// which belongs to whoever configured the webhook without one.
export async function verifyWhatsAppWebhookSignature({ rawBody, signature }) {
  const secret = await getSetting("WHATSAPP_APP_SECRET", process.env.WHATSAPP_APP_SECRET);
  if (!secret) return true;

  const given = String(signature ?? "").replace(/^sha256=/, "");
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");

  const expectedBuf = Buffer.from(expected, "utf8");
  const givenBuf = Buffer.from(given, "utf8");
  if (expectedBuf.length !== givenBuf.length) return false;
  return timingSafeEqual(expectedBuf, givenBuf);
}
