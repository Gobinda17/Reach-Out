import "server-only";
import { prisma } from "@/lib/db";

const REQUEST_LIMIT = 5;
const REQUEST_WINDOW_MS = 15 * 60 * 1000;

// In-memory per-tag throttle, same tradeoff as lib/otp.js's request log:
// resets on restart, not shared across instances, fine at this app's scale.
const globalForRateLimit = globalThis;
const callRequestLog = globalForRateLimit.callRequestLog ?? new Map();
const messageRequestLog = globalForRateLimit.messageRequestLog ?? new Map();
if (process.env.NODE_ENV !== "production") {
  globalForRateLimit.callRequestLog = callRequestLog;
  globalForRateLimit.messageRequestLog = messageRequestLog;
}

function checkLimit(log, tagCode, ErrorClass, message) {
  const now = Date.now();
  const attempts = (log.get(tagCode) ?? []).filter((t) => now - t < REQUEST_WINDOW_MS);
  if (attempts.length >= REQUEST_LIMIT) {
    throw new ErrorClass(message);
  }
  attempts.push(now);
  log.set(tagCode, attempts);
}

export class CallRateLimitError extends Error {}
export class MessageRateLimitError extends Error {}

export function checkCallRateLimit(tagCode) {
  checkLimit(
    callRequestLog,
    tagCode,
    CallRateLimitError,
    "Too many call attempts for this tag. Try again in a few minutes."
  );
}

export function checkMessageRateLimit(tagCode) {
  checkLimit(
    messageRequestLog,
    tagCode,
    MessageRateLimitError,
    "Too many messages sent for this tag. Try again in a few minutes."
  );
}

// checkCallRateLimit above caps total attempts over 15 minutes, but doesn't
// stop two overlapping calls to the same tag or someone redialing the
// instant a call ends — both read as spam/harassment to the owner, who now
// (per lib/calling.js's edesy concurrency change) can genuinely receive more
// than one simultaneous masked call. This is DB-backed rather than the
// in-memory log above because it has to agree with the actual Call rows
// (and stay correct across instances) rather than just throttle attempts.
const RINGING_WINDOW_MS = 3 * 60 * 1000; // "allocated" and not yet resolved by a lifecycle event
const CONNECTED_SAFETY_WINDOW_MS = 10 * 60 * 1000; // caps how long a stuck "connected" row can block, in case "call.ended" never arrives
const POST_CALL_COOLDOWN_MS = 2 * 60 * 1000; // after a call that actually connected — owner already got through, more calls right after read as harassment
const RETRY_COOLDOWN_MS = 20 * 1000; // after a call that never connected (missed/expired) — a genuine retry shouldn't be blocked for long

export class CallInProgressError extends Error {}
export class CallCooldownError extends Error {}

export async function checkCallSpamGuard(tagId) {
  const lastCall = await prisma.call.findFirst({
    where: { tagId },
    orderBy: { createdAt: "desc" },
    select: { status: true, createdAt: true },
  });
  if (!lastCall) return;

  const ageMs = Date.now() - lastCall.createdAt.getTime();

  const inProgress =
    (lastCall.status === "allocated" && ageMs < RINGING_WINDOW_MS) ||
    (lastCall.status === "connected" && ageMs < CONNECTED_SAFETY_WINDOW_MS);
  if (inProgress) {
    throw new CallInProgressError(
      "A call to this tag is already in progress. Please wait for it to finish before calling again."
    );
  }

  const wasConnected = lastCall.status === "connected" || lastCall.status === "ended";
  const cooldown = wasConnected ? POST_CALL_COOLDOWN_MS : RETRY_COOLDOWN_MS;
  if (ageMs < cooldown) {
    throw new CallCooldownError(
      wasConnected
        ? "You just connected with this tag's owner. Please wait a couple of minutes before calling again."
        : "Please wait a moment before calling this tag again."
    );
  }
}

// The last-four-digits plate challenge is only 10,000 combinations, so without
// a cap it would be trivially brute-forced by anyone holding the URL — which is
// exactly the person it exists to stop. Only FAILED attempts count, so someone
// who fumbles a digit once isn't punished, and a success clears the slate.
const PLATE_FAILURE_LIMIT = 5;
const plateFailureLog = globalForRateLimit.plateFailureLog ?? new Map();
if (process.env.NODE_ENV !== "production") {
  globalForRateLimit.plateFailureLog = plateFailureLog;
}

export class PlateAttemptError extends Error {}

export function assertPlateAttempts(tagCode) {
  const now = Date.now();
  const failures = (plateFailureLog.get(tagCode) ?? []).filter(
    (t) => now - t < REQUEST_WINDOW_MS
  );
  if (failures.length >= PLATE_FAILURE_LIMIT) {
    throw new PlateAttemptError(
      "Too many incorrect plate numbers for this tag. Try again in a few minutes."
    );
  }
}

export function recordPlateFailure(tagCode) {
  const now = Date.now();
  const failures = (plateFailureLog.get(tagCode) ?? []).filter(
    (t) => now - t < REQUEST_WINDOW_MS
  );
  failures.push(now);
  plateFailureLog.set(tagCode, failures);
}

export function clearPlateFailures(tagCode) {
  plateFailureLog.delete(tagCode);
}
