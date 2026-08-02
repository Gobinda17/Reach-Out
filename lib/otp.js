import "server-only";
import { randomInt, createHmac } from "node:crypto";
import { prisma } from "@/lib/db";
import { sendOtpSms } from "@/lib/sms";
import { getSetting } from "@/lib/settings";

const OTP_TTL_MINUTES = 10;
const MAX_VERIFY_ATTEMPTS = 5;
const REQUEST_LIMIT = 3;
const REQUEST_WINDOW_MS = 15 * 60 * 1000;

// Testing escape hatch: with OTP_DEV_MODE=true every login code is the fixed
// value below instead of a random one. Must never be on in production.
const DEV_OTP_CODE = "111111";

async function devModeEnabled() {
  const value = await getSetting("OTP_DEV_MODE", process.env.OTP_DEV_MODE);
  return value === "true";
}

// In-memory per-phone request throttle. Resets on restart and isn't shared across
// instances — fine at this app's scale, but swap for Redis if it ever runs multi-instance.
const globalForRateLimit = globalThis;
const requestLog = globalForRateLimit.otpRequestLog ?? new Map();
if (process.env.NODE_ENV !== "production") {
  globalForRateLimit.otpRequestLog = requestLog;
}

export class OtpRateLimitError extends Error {}

function hashCode(phone, code) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET environment variable is not set.");
  }
  return createHmac("sha256", secret).update(`${phone}:${code}`).digest("hex");
}

function checkRateLimit(phone) {
  const now = Date.now();
  const attempts = (requestLog.get(phone) ?? []).filter((t) => now - t < REQUEST_WINDOW_MS);
  if (attempts.length >= REQUEST_LIMIT) {
    throw new OtpRateLimitError("Too many codes requested. Try again in a few minutes.");
  }
  attempts.push(now);
  requestLog.set(phone, attempts);
}

export async function requestOtp(phone, purpose = "login") {
  checkRateLimit(phone);

  let code;
  if (await devModeEnabled()) {
    console.warn("[otp] OTP_DEV_MODE is on — issuing the fixed test code.");
    code = DEV_OTP_CODE;
  } else {
    code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  }

  const codeHash = hashCode(phone, code);

  await prisma.otp.create({
    data: {
      phone,
      codeHash,
      purpose,
      expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000),
    },
  });

  await sendOtpSms(phone, code);
}

// `purpose` is part of the check, not decoration. A code issued to confirm a
// WhatsApp number for a free eTag must never be accepted as a login code:
// otherwise anyone who talks a user into reading out that "harmless" code has
// taken over their account. Callers must pass the purpose they issued with.
export async function verifyOtp(phone, code, purpose = "login") {
  const otp = await prisma.otp.findFirst({
    where: { phone, purpose, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });

  if (!otp || otp.attempts >= MAX_VERIFY_ATTEMPTS) return false;

  const matches = hashCode(phone, code) === otp.codeHash;

  if (!matches) {
    await prisma.otp.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    return false;
  }

  await prisma.otp.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });
  return true;
}
