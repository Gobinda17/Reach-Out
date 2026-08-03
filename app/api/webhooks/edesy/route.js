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

  // Most recent non-expired allocation for this masked number — numbers get
  // reused across calls, so this can't just be a unique lookup.
  const call = await prisma.call.findFirst({
    where: { virtualNumber: { endsWith: maskedLast10 }, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    select: { id: true, callerPhone: true, tag: { select: { phone: true } } },
  });

  if (!call || !call.callerPhone || !call.tag?.phone) {
    return NextResponse.json({ action: "reject", reject_reason: "not available" });
  }

  const ownerLast10 = last10Digits(call.tag.phone);
  const bookedCallerLast10 = last10Digits(call.callerPhone);

  let targetNumber = null;
  if (callerLast10 === bookedCallerLast10) {
    targetNumber = ownerLast10;
  } else if (callerLast10 === ownerLast10) {
    targetNumber = bookedCallerLast10;
  }

  if (!targetNumber) {
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
