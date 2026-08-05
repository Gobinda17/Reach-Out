import { NextResponse } from "next/server";
import { verifyWhatsAppChallenge, verifyWhatsAppWebhookSignature } from "@/lib/whatsapp";

// Meta's one-time verification handshake, fired when you save the Callback
// URL + Verify token in the app dashboard's "Configure Webhooks" screen.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const challenge = await verifyWhatsAppChallenge({
    mode: searchParams.get("hub.mode"),
    token: searchParams.get("hub.verify_token"),
    challenge: searchParams.get("hub.challenge"),
  });

  if (challenge === null) {
    return NextResponse.json({ error: "Verification failed" }, { status: 403 });
  }
  return new NextResponse(challenge, { status: 200 });
}

// Delivery/read-status callbacks for template notifications this app sends
// (see lib/whatsapp.js's sendScanNotification). Outbound-notify-only for
// now — the owner still replies from the Reach-Out dashboard, not WhatsApp
// itself — so there's nothing to route an inbound message to yet; this just
// logs status so a failed send is visible without digging through Meta's
// own dashboard.
export async function POST(request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  const valid = await verifyWhatsAppWebhookSignature({ rawBody, signature });
  if (!valid) {
    console.warn("[whatsapp webhook] signature mismatch");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const body = JSON.parse(rawBody);
  const statuses =
    body?.entry?.flatMap((entry) => entry?.changes?.flatMap((c) => c?.value?.statuses ?? []) ?? []) ??
    [];

  for (const status of statuses) {
    if (status.status === "failed") {
      console.error(`[whatsapp] message ${status.id} failed:`, JSON.stringify(status.errors));
    } else {
      console.log(`[whatsapp] message ${status.id} -> ${status.status}`);
    }
  }

  return NextResponse.json({ ok: true });
}
