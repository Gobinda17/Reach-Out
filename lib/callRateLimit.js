import "server-only";

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
