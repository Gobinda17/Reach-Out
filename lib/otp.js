import "server-only";
import { randomInt, createHmac } from "node:crypto";
import { prisma } from "@/lib/db";
import { sendOtpSms } from "@/lib/sms";
import { getSetting } from "@/lib/settings";
import { normalizePhone } from "@/lib/phone";

const OTP_TTL_MINUTES = 10;
const MAX_VERIFY_ATTEMPTS = 5;
// Five, not three. Three is spent by one typo plus two "it didn't arrive"
// resends — which is a real person logging in, not an attacker.
const REQUEST_LIMIT = 5;
const REQUEST_WINDOW_MS = 15 * 60 * 1000;

// Testing escape hatch: with OTP_DEV_MODE=true every login code is the fixed
// value below instead of a random one. Must never be on in production.
const DEV_OTP_CODE = "111111";

async function devModeEnabled() {
  const value = await getSetting("OTP_DEV_MODE", process.env.OTP_DEV_MODE);
  return value === "true";
}

// The seeded staff numbers (prisma/seed.mjs — same env vars and fallbacks)
// always get the fixed test code and skip WhatsApp entirely, regardless of
// the global OTP_DEV_MODE toggle. Lets you log in as admin without a real
// phone behind that number, while every other number still gets a real
// WhatsApp OTP even with dev mode off. Checked against the database, not
// just the env var — a candidate phone only bypasses if it was actually
// seeded (a User row for it exists), so pointing SEED_ADMIN_PHONE at a real
// number without re-seeding never grants it the fixed-code bypass.
async function staticTestNumbers() {
  const candidates = [
    process.env.SEED_SUPERADMIN_PHONE || "+919000000000",
    process.env.SEED_ADMIN_PHONE || "+919000000001",
    process.env.SEED_SALES_PHONE || "+919000000002",
  ]
    .map((n) => normalizePhone(n))
    .filter(Boolean);
  if (candidates.length === 0) return [];

  const seeded = await prisma.user.findMany({
    where: { phone: { in: candidates } },
    select: { phone: true },
  });
  return seeded.map((u) => u.phone);
}

// In-memory request throttle, keyed by phone AND purpose. Resets on restart and
// isn't shared across instances — fine at this app's scale, but swap for Redis
// if it ever runs multi-instance.
//
// The purpose is part of the key deliberately. Logging in, changing your number
// and claiming a free eTag are three different budgets: sharing one meant that
// trying the free-eTag flow with your own number silently used up your login
// allowance, and the next real login was refused for fifteen minutes.
const globalForRateLimit = globalThis;
const requestLog = globalForRateLimit.otpRequestLog ?? new Map();
if (process.env.NODE_ENV !== "production") {
  globalForRateLimit.otpRequestLog = requestLog;
}

export class OtpRateLimitError extends Error {
  constructor(message, retryAfterSeconds) {
    super(message);
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

function hashCode(phone, code) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET environment variable is not set.");
  }
  return createHmac("sha256", secret).update(`${phone}:${code}`).digest("hex");
}

function limiterKey(phone, purpose) {
  return `${purpose}:${phone}`;
}

function recentAttempts(key) {
  const now = Date.now();
  return (requestLog.get(key) ?? []).filter((t) => now - t < REQUEST_WINDOW_MS);
}

function assertUnderLimit(key) {
  const attempts = recentAttempts(key);
  if (attempts.length < REQUEST_LIMIT) return;

  // "A few minutes" leaves someone refreshing blindly. Say how long.
  const oldest = Math.min(...attempts);
  const seconds = Math.max(1, Math.ceil((REQUEST_WINDOW_MS - (Date.now() - oldest)) / 1000));
  const minutes = Math.ceil(seconds / 60);
  throw new OtpRateLimitError(
    `Too many codes requested for this number. Try again in ${minutes} minute${
      minutes === 1 ? "" : "s"
    }.`,
    seconds
  );
}

function recordAttempt(key) {
  const attempts = recentAttempts(key);
  attempts.push(Date.now());
  requestLog.set(key, attempts);
}

// Clears the budget once a code is actually used. Someone who just proved they
// hold the number is not the person this throttle is aimed at — without this,
// logging out and back in could land on a lockout caused by your own earlier
// successful logins.
export function clearOtpRateLimit(phone, purpose = "login") {
  requestLog.delete(limiterKey(phone, purpose));
}

export async function requestOtp(phone, purpose = "login") {
  const devMode = await devModeEnabled();
  const isStaticTestNumber = (await staticTestNumbers()).includes(phone);
  const bypass = devMode || isStaticTestNumber;
  const key = limiterKey(phone, purpose);

  // The throttle exists to stop someone looping this public endpoint against a
  // stranger's number — flooding their phone and running up an SMS bill. With
  // OTP_DEV_MODE on (or a seeded staff number) there is no real send and the
  // code is a fixed 111111, so it guards nothing and only gets in the way of
  // testing. It stays fully active wherever real codes are sent.
  if (!bypass) assertUnderLimit(key);

  let code;
  if (bypass) {
    console.warn(
      isStaticTestNumber
        ? `[otp] ${phone} is a seeded staff test number — issuing the fixed test code, throttle skipped.`
        : "[otp] OTP_DEV_MODE is on — issuing the fixed test code, throttle skipped."
    );
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

  await sendOtpSms(phone, code, { devMode: bypass });

  // Counted only once the code has actually gone out, so a provider failure
  // doesn't quietly spend someone's allowance.
  if (!bypass) recordAttempt(key);
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
  clearOtpRateLimit(phone, purpose);
  return true;
}
