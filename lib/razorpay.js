import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

const RAZORPAY_API = "https://api.razorpay.com/v1";

export class RazorpayError extends Error {}

// Testing escape hatch: with RAZORPAY_DEV_MODE=true, paid orders skip Razorpay
// entirely and are issued as if already paid. Must never be on in production.
export function paymentDevModeEnabled() {
  return process.env.RAZORPAY_DEV_MODE === "true";
}

function credentials() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new RazorpayError(
      "RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not set. Add your keys from the Razorpay dashboard."
    );
  }
  return { keyId, keySecret };
}

export function razorpayKeyId() {
  return credentials().keyId;
}

// Creates an order on Razorpay's side. `amountPaise` must come from the server-side
// catalogue — never from the request body.
export async function createRazorpayOrder({ amountPaise, currency = "INR", notes }) {
  const { keyId, keySecret } = credentials();
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
export function verifyPaymentSignature({ orderId, paymentId, signature }) {
  const { keySecret } = credentials();
  const expected = createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  const given = typeof signature === "string" ? signature : "";
  const expectedBuf = Buffer.from(expected, "utf8");
  const givenBuf = Buffer.from(given, "utf8");

  if (expectedBuf.length !== givenBuf.length) return false;
  return timingSafeEqual(expectedBuf, givenBuf);
}
