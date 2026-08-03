import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { getSetting } from "@/lib/settings";

const RAZORPAY_API = "https://api.razorpay.com/v1";

export class RazorpayError extends Error {}

// Testing escape hatch: with RAZORPAY_DEV_MODE=true, paid orders skip Razorpay
// entirely and are issued as if already paid. Must never be on in production.
// DB setting (from /admin/settings) overrides the env var.
export async function paymentDevModeEnabled() {
  const value = await getSetting("RAZORPAY_DEV_MODE", process.env.RAZORPAY_DEV_MODE);
  return value === "true";
}

async function credentials() {
  const keyId = await getSetting("RAZORPAY_KEY_ID", process.env.RAZORPAY_KEY_ID);
  const keySecret = await getSetting("RAZORPAY_KEY_SECRET", process.env.RAZORPAY_KEY_SECRET);
  if (!keyId || !keySecret) {
    throw new RazorpayError(
      "Razorpay keys are not set. Add them at /admin/settings or via RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET."
    );
  }
  return { keyId, keySecret };
}

// Separate from the API key/secret pair above — this is the secret you set
// once in the Razorpay Dashboard's Webhooks section alongside the webhook URL,
// and Razorpay uses it (not the API key) to sign webhook payloads.
async function webhookSecret() {
  const secret = await getSetting("RAZORPAY_WEBHOOK_SECRET", process.env.RAZORPAY_WEBHOOK_SECRET);
  if (!secret) {
    throw new RazorpayError(
      "RAZORPAY_WEBHOOK_SECRET is not set. Add it at /admin/settings, matching the secret configured for this webhook URL in the Razorpay Dashboard."
    );
  }
  return secret;
}

export async function razorpayKeyId() {
  return (await credentials()).keyId;
}

// Creates an order on Razorpay's side. `amountPaise` must come from the server-side
// catalogue — never from the request body.
export async function createRazorpayOrder({ amountPaise, currency = "INR", notes }) {
  const { keyId, keySecret } = await credentials();
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

  const res = await fetch(`${RAZORPAY_API}/orders`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ amount: amountPaise, currency, notes }),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new RazorpayError(data?.error?.description ?? "Razorpay rejected the order request.");
  }
  return data;
}

// Razorpay signs `${order_id}|${payment_id}` with the key secret. Anything that
// doesn't reproduce that HMAC did not come from Razorpay.
export async function verifyPaymentSignature({ orderId, paymentId, signature }) {
  const { keySecret } = await credentials();
  const expected = createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  const given = typeof signature === "string" ? signature : "";
  const expectedBuf = Buffer.from(expected, "utf8");
  const givenBuf = Buffer.from(given, "utf8");

  if (expectedBuf.length !== givenBuf.length) return false;
  return timingSafeEqual(expectedBuf, givenBuf);
}

// Webhooks are signed over the *raw* request body (not the parsed/re-serialized
// JSON — any whitespace difference would break this), using the webhook
// secret rather than the API key secret. See app/api/orders/webhook/route.js.
export async function verifyWebhookSignature({ rawBody, signature }) {
  const secret = await webhookSecret();
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");

  const given = typeof signature === "string" ? signature : "";
  const expectedBuf = Buffer.from(expected, "utf8");
  const givenBuf = Buffer.from(given, "utf8");

  if (expectedBuf.length !== givenBuf.length) return false;
  return timingSafeEqual(expectedBuf, givenBuf);
}
