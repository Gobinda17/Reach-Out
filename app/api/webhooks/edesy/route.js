import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyEdesyWebhookSignature } from "@/lib/calling";
import { last10Digits } from "@/lib/phone";

// edesy's masking-route webhook: hit in real time whenever someone dials one
// of our masked numbers, and expected to answer within 5s with who to bridge
// the call to. Configure this route's absolute URL + (optionally) a signing
// secret in edesy's dashboard webhook screen — the secret must match
// CALLMASK_WEBHOOK_SECRET (settable at /admin/settings or the env var).
//
// We don't pre-tell edesy which two numbers a masked call should bridge —
// allocateVirtualNumber() (lib/calling.js) only reserves the masked number
// itself. This webhook is what actually resolves a live call to a real
// target, by matching the incoming caller against the Call row's stored
// callerPhone / the tag's owner phone.
//
// edesy can put more than one live call on the same DID at once, so a
// masked number can have several active Call rows at the same time — we
// can't just grab the newest one. Instead we walk the candidates (newest
// first, as a tiebreak) and pick the one whose booked caller or tag owner
// actually matches who's calling right now.
export async function POST(request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-edesy-signature");

  const valid = await verifyEdesyWebhookSignature({ rawBody, signature });
  if (!valid) {
    console.warn("[edesy webhook] signature mismatch");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const body = JSON.parse(rawBody);

  if (body?.event !== "masking.route") {
    return NextResponse.json({ action: "reject", reject_reason: "unsupported_event" });
  }

  const maskedLast10 = last10Digits(body?.masked_number);
  const callerLast10 = last10Digits(body?.caller);
  if (!maskedLast10 || !callerLast10) {
    return NextResponse.json({ action: "reject", reject_reason: "invalid_request" });
  }

  // All non-expired allocations for this masked number — a DID can carry
  // more than one live call at once, so this can't be a single-row lookup.
  const candidates = await prisma.call.findMany({
    where: { virtualNumber: { endsWith: maskedLast10 }, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    select: { id: true, callerPhone: true, targetPhone: true, tag: { select: { phone: true } } },
  });

  let call = null;
  let targetNumber = null;
  for (const candidate of candidates) {
    // targetPhone is set on every call created after it was added (either
    // the owner's normal number or, for an Emergency call, their
    // emergencyPhone) — tag.phone is only a fallback for older rows.
    const ownerNumber = candidate.targetPhone || candidate.tag?.phone;
    if (!candidate.callerPhone || !ownerNumber) continue;

    const ownerLast10 = last10Digits(ownerNumber);
    const bookedCallerLast10 = last10Digits(candidate.callerPhone);

    if (callerLast10 === bookedCallerLast10) {
      call = candidate;
      targetNumber = ownerLast10;
      break;
    }
    if (callerLast10 === ownerLast10) {
      call = candidate;
      targetNumber = bookedCallerLast10;
      break;
    }
  }

  if (!call || !targetNumber) {
    return NextResponse.json({ action: "reject", reject_reason: "caller_mismatch" });
  }

  // Recorded so the lifecycle-events webhook (events/route.js) can match
  // call.connected/call.ended/etc. to this row by call_sid instead of
  // falling back to a masked-number lookup.
  if (body?.call_sid) {
    await prisma.call.update({ where: { id: call.id }, data: { providerCallId: body.call_sid } });
  }

  return NextResponse.json({ action: "connect", target_number: targetNumber });
}
