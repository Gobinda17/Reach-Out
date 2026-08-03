import "server-only";
import { randomInt, createHmac, timingSafeEqual } from "node:crypto";
import { getSetting } from "@/lib/settings";
import { prisma } from "@/lib/db";

const VIRTUAL_NUMBER_TTL_MINUTES = 15;

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

// edesy DIDs are bought and routing-configured once in edesy's own dashboard
// (each number set to hit app/api/webhooks/edesy/route.js for live routing
// decisions) rather than allocated on demand through an API — an earlier
// version of this called edesy's Session API (POST /masking/sessions) to
// request an ephemeral number per call, but that consistently failed with
// "no masking numbers enrolled" even after buying and configuring a DID in
// the dashboard, because that dynamic session pool turned out to be a
// separate resource from dashboard-configured numbers. So instead we manage
// our own fixed pool: CALLMASK_NUMBERS (set at /admin/settings, comma-
// separated E.164 numbers) lists the DIDs bought in edesy's dashboard, and
// this just hands out whichever one isn't currently tied to an active,
// unexpired Call.
async function allocateEdesyNumber() {
  const raw = await getSetting("CALLMASK_NUMBERS", process.env.CALLMASK_NUMBERS);
  const numbers = (raw ?? "")
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean);

  if (numbers.length === 0) {
    throw new CallProviderError(
      "No masking numbers configured — add the DIDs bought in edesy's dashboard at /admin/settings."
    );
  }

  const busy = await prisma.call.findMany({
    where: {
      virtualNumber: { in: numbers },
      expiresAt: { gt: new Date() },
      status: { notIn: ["ended", "missed"] },
    },
    select: { virtualNumber: true },
  });
  const busySet = new Set(busy.map((c) => c.virtualNumber));

  const virtualNumber = numbers.find((n) => !busySet.has(n));
  if (!virtualNumber) {
    throw new CallProviderError("All masking numbers are currently busy. Try again shortly.");
  }

  return {
    virtualNumber,
    providerCallId: null,
    expiresAt: new Date(Date.now() + VIRTUAL_NUMBER_TTL_MINUTES * 60 * 1000),
  };
}

// Returns { provider, virtualNumber, providerCallId, expiresAt }. Callers
// persist this as a Call row — see app/api/tags/[code]/call/route.js.
export async function allocateVirtualNumber() {
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
    const { virtualNumber, providerCallId, expiresAt } = await allocateEdesyNumber();
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

// edesy's masking-route webhook signs its POST body as
// `X-Edesy-Signature: sha256=<hmac>` using a secret set independently in
// their dashboard's webhook config screen — separate from CALLMASK_API_KEY,
// which authenticates *our* requests to their Session API rather than
// theirs to us. Their dashboard marks this secret optional, so an unset
// secret means "don't verify" rather than "reject everything" — that
// tradeoff belongs to whoever configured the webhook without one, not to us.
export async function verifyEdesyWebhookSignature({ rawBody, signature }) {
  const secret = await getSetting("CALLMASK_WEBHOOK_SECRET", process.env.CALLMASK_WEBHOOK_SECRET);
  if (!secret) return true;

  const given = String(signature ?? "").replace(/^sha256=/, "");
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");

  const expectedBuf = Buffer.from(expected, "utf8");
  const givenBuf = Buffer.from(given, "utf8");
  if (expectedBuf.length !== givenBuf.length) return false;
  return timingSafeEqual(expectedBuf, givenBuf);
}
