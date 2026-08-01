import "server-only";
import { randomInt } from "node:crypto";

const VIRTUAL_NUMBER_TTL_MINUTES = 15;

export class CallProviderError extends Error {}

// Config switch, not a real provider list yet — see the module docstring on
// the Call model in prisma/schema.prisma. Add a case here (and a matching
// provider module) once a real telephony account exists; until then every
// environment runs on "dev" and CALL_PROVIDER is simply unset.
function providerName() {
  return process.env.CALL_PROVIDER || "dev";
}

// Dev bypass: allocates a syntactically-plausible but non-dialable number and
// wires nothing up behind it — mirrors RAZORPAY_DEV_MODE's "flow works,
// nothing real happens" approach. Never used unless CALL_PROVIDER is unset.
function allocateDevNumber() {
  const digits = String(randomInt(0, 1_000_000_000)).padStart(9, "0");
  return { virtualNumber: `+91${digits}`, providerCallId: null };
}

// Returns { provider, virtualNumber, providerCallId, expiresAt }. Callers
// persist this as a Call row — see app/api/tags/[code]/call/route.js.
export async function allocateVirtualNumber() {
  const provider = providerName();

  if (provider === "dev") {
    const { virtualNumber, providerCallId } = allocateDevNumber();
    return {
      provider,
      virtualNumber,
      providerCallId,
      expiresAt: new Date(Date.now() + VIRTUAL_NUMBER_TTL_MINUTES * 60 * 1000),
    };
  }

  // Real providers (Exotel, Twilio, ...) plug in here once there are
  // credentials to call them with.
  throw new CallProviderError(
    `Calling provider "${provider}" isn't configured yet. Unset CALL_PROVIDER to use the dev bypass.`
  );
}

export function callProviderIsDev() {
  return providerName() === "dev";
}
