import "server-only";

const REQUEST_LIMIT = 5;
const REQUEST_WINDOW_MS = 15 * 60 * 1000;

// In-memory per-tag throttle, same tradeoff as lib/otp.js's request log:
// resets on restart, not shared across instances, fine at this app's scale.
const globalForRateLimit = globalThis;
const requestLog = globalForRateLimit.callRequestLog ?? new Map();
if (process.env.NODE_ENV !== "production") {
  globalForRateLimit.callRequestLog = requestLog;
}

export class CallRateLimitError extends Error {}

export function checkCallRateLimit(tagCode) {
  const now = Date.now();
  const attempts = (requestLog.get(tagCode) ?? []).filter((t) => now - t < REQUEST_WINDOW_MS);
  if (attempts.length >= REQUEST_LIMIT) {
    throw new CallRateLimitError("Too many call attempts for this tag. Try again in a few minutes.");
  }
  attempts.push(now);
  requestLog.set(tagCode, attempts);
}
