import "server-only";
import { randomInt } from "node:crypto";
import { getSetting } from "@/lib/settings";

const VIRTUAL_NUMBER_TTL_MINUTES = 15;
const EDESY_BASE_URL = "https://voice-api.edesy.in/v1";

export class CallProviderError extends Error {}

// Every provider this code actually knows how to talk to. An admin can only
// pick from this list at /admin/settings — switching to a brand-new provider
// (not just editing which one is active) still needs a small code addition
// here, since we can't invent a whole new API integration from a form.
export const CALL_PROVIDERS = [
  { key: "dev", label: "Dev bypass (no real calls)" },
  { key: "edesy", label: "Edesy (voice-api.edesy.in)" },
];

// DB setting overrides the env var, so an admin can switch providers from
// /admin/settings without a redeploy. "dev" (the default, when neither is
// set) allocates a fake number and wires nothing up.
async function providerName() {
  return (await getSetting("CALL_PROVIDER", process.env.CALL_PROVIDER)) || "dev";
}

// Dev bypass: allocates a syntactically-plausible but non-dialable number and
// wires nothing up behind it — mirrors RAZORPAY_DEV_MODE's "flow works,
// nothing real happens" approach. Never used unless CALL_PROVIDER is unset.
function allocateDevNumber() {
  const digits = String(randomInt(0, 1_000_000_000)).padStart(9, "0");
  return { virtualNumber: `+91${digits}`, providerCallId: null };
}

// Edesy's Session API binds two real numbers to one temporary virtual
// number; either party can dial that number and gets bridged to the other,
// with neither side ever seeing the other's real number. This requires both
// real numbers up front (there's no way to hand a stranger a dial-able
// number without telling the provider who they are), which is why callers
// of allocateVirtualNumber() must now pass callerPhone.
//
// NOTE: the response field names below (virtual_number / session_id /
// expires_at) are inferred from the request-side API reference — the
// response schema wasn't visible when this was wired up. Verify these
// against the actual response from masking.edesy.in (or their support) and
// adjust the `data.foo ?? data.bar` fallbacks if the real keys differ.
async function allocateEdesySession({ ownerPhone, callerPhone, reference }) {
  const apiKey = await getSetting("CALLMASK_API_KEY", process.env.CALLMASK_API_KEY);
  if (!apiKey) {
    throw new CallProviderError("No masking API key configured — set one at /admin/settings.");
  }

  let res;
  try {
    res = await fetch(`${EDESY_BASE_URL}/masking/sessions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        party_a: ownerPhone,
        party_b: callerPhone,
        reference,
        expiry_minutes: VIRTUAL_NUMBER_TTL_MINUTES,
      }),
    });
  } catch {
    throw new CallProviderError("Could not reach the masking provider. Try again shortly.");
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new CallProviderError(
      data?.message || data?.error || `Masking provider request failed (${res.status}).`
    );
  }

  const virtualNumber = data?.virtual_number ?? data?.virtualNumber ?? data?.number;
  if (!virtualNumber) {
    throw new CallProviderError("Masking provider didn't return a virtual number.");
  }

  const providerCallId = data?.session_id ?? data?.id ?? data?.reference ?? null;
  const expiresAt = data?.expires_at
    ? new Date(data.expires_at)
    : new Date(Date.now() + VIRTUAL_NUMBER_TTL_MINUTES * 60 * 1000);

  return { virtualNumber, providerCallId, expiresAt };
}

// Returns { provider, virtualNumber, providerCallId, expiresAt }. Callers
// persist this as a Call row — see app/api/tags/[code]/call/route.js.
// ownerPhone is always required; callerPhone is required by every real
// provider (see allocateEdesySession above) but unused by the dev bypass.
export async function allocateVirtualNumber({ ownerPhone, callerPhone, reference } = {}) {
  const provider = await providerName();

  if (provider === "dev") {
    const { virtualNumber, providerCallId } = allocateDevNumber();
    return {
      provider,
      virtualNumber,
      providerCallId,
      expiresAt: new Date(Date.now() + VIRTUAL_NUMBER_TTL_MINUTES * 60 * 1000),
    };
  }

  if (provider === "edesy") {
    const { virtualNumber, providerCallId, expiresAt } = await allocateEdesySession({
      ownerPhone,
      callerPhone,
      reference,
    });
    return { provider, virtualNumber, providerCallId, expiresAt };
  }

  // Other real providers (Exotel, Twilio, ...) plug in here the same way.
  throw new CallProviderError(
    `Calling provider "${provider}" isn't configured yet. Unset CALL_PROVIDER to use the dev bypass.`
  );
}

export async function callProviderIsDev() {
  return (await providerName()) === "dev";
}
