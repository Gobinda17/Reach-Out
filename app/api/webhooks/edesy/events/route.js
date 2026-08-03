import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyEdesyWebhookSignature } from "@/lib/calling";
import { last10Digits } from "@/lib/phone";

// edesy's account-wide lifecycle-event webhook (separate from the per-number
// masking.route routing webhook in ../route.js) — informational events about
// a session/call's progress, not a routing decision. Signed the same way
// (X-Edesy-Signature, HMAC-SHA256 over the raw body), so it shares
// CALLMASK_WEBHOOK_SECRET; use the same secret value in both of edesy's
// webhook config screens.
//
// NOTE: edesy's dashboard doesn't document a payload shape for these events
// the way it does for masking.route — session_id/call_sid/masked_number
// below are a best guess based on the routing webhook's fields. Check the
// "Recent deliveries" panel (or this handler's console.warn for unmatched
// events) after the first real delivery and adjust if the real keys differ.
const STATUS_BY_EVENT = {
  "call.connected": "connected",
  "call.missed": "missed",
  "call.ended": "ended",
  "session.expired": "expired",
};

export async function POST(request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-edesy-signature");

  const valid = await verifyEdesyWebhookSignature({ rawBody, signature });
  if (!valid) {
    console.warn("[edesy events webhook] signature mismatch");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const body = JSON.parse(rawBody);
  const status = STATUS_BY_EVENT[body?.event];

  // session.created / call.incoming carry no status change for us — just
  // acknowledge them so edesy doesn't retry.
  if (!status) {
    return NextResponse.json({ ok: true });
  }

  const identifier = body?.session_id ?? body?.call_sid ?? null;
  let call = identifier
    ? await prisma.call.findFirst({ where: { providerCallId: identifier } })
    : null;

  if (!call) {
    const maskedLast10 = last10Digits(body?.masked_number);
    if (maskedLast10) {
      call = await prisma.call.findFirst({
        where: { virtualNumber: { endsWith: maskedLast10 } },
        orderBy: { createdAt: "desc" },
      });
    }
  }

  if (!call) {
    console.warn("[edesy events webhook] no matching call for event:", body?.event, rawBody);
    return NextResponse.json({ ok: true });
  }

  await prisma.call.update({ where: { id: call.id }, data: { status } });
  return NextResponse.json({ ok: true });
}
