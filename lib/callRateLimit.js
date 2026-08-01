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
