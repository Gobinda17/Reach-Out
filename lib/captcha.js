import "server-only";
import { randomInt, createHmac, timingSafeEqual } from "node:crypto";

const TTL_MS = 15 * 60 * 1000;

// The answer never leaves the server and is never stored: the token carries an
// expiry plus an HMAC over (expiry, answer), so verifying is just recomputing
// the HMAC with whatever the visitor typed. A client that edits the token or
// replays an old one fails the signature or the expiry check.
//
// Same trick as lib/otp.js's hashCode — signed, stateless, no extra table.
function sign(expiresAt, answer) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET environment variable is not set.");
  return createHmac("sha256", secret).update(`captcha:${expiresAt}:${answer}`).digest("hex");
}

export function issueCaptcha() {
  const a = randomInt(1, 10);
  const b = randomInt(10, 20);
  const expiresAt = Date.now() + TTL_MS;
  return {
    question: `${a} + ${b}`,
    token: `${expiresAt}.${sign(expiresAt, a + b)}`,
  };
}

export function verifyCaptcha(token, answer) {
  if (typeof token !== "string") return false;

  const [expiresRaw, mac] = token.split(".");
  const expiresAt = Number(expiresRaw);
  if (!Number.isInteger(expiresAt) || !mac) return false;
  if (Date.now() > expiresAt) return false;

  const parsed = Number(String(answer ?? "").trim());
  if (!Number.isInteger(parsed)) return false;

  const expected = Buffer.from(sign(expiresAt, parsed), "hex");
  const given = Buffer.from(mac, "hex");
  return expected.length === given.length && timingSafeEqual(expected, given);
}
