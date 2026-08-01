import "server-only";
import { SignJWT, jwtVerify } from "jose";

// Short-lived on purpose: long enough for someone to read the contact card
// and act, short enough that a stale/shared/bookmarked link (or a script
// hitting the API directly with just the tag code) can't be replayed to spam
// calls or messages. This doesn't protect the tag code itself — that's
// printed on the tag and meant to be public — it just requires a *fresh*
// visit to the contact card before the call/message endpoints will work.
const TOKEN_TTL_SECONDS = 10 * 60;

function secretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET environment variable is not set.");
  }
  return new TextEncoder().encode(secret);
}

// Issued once per contact-card render (the /t/[code] page load, or the
// /scan lookup), never persisted — the signature + expiry is the whole point.
export async function createScanToken(code) {
  return new SignJWT({ code })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_TTL_SECONDS}s`)
    .sign(secretKey());
}

// Returns true only if the token is validly signed, unexpired, and was
// issued for this exact tag code.
export async function verifyScanToken(token, code) {
  if (typeof token !== "string" || !token) return false;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    return payload.code === code;
  } catch {
    return false;
  }
}
