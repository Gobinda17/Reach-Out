import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyWebhookSignature, RazorpayError } from "@/lib/razorpay";
import { issuePaidTag } from "@/lib/orders";

// Server-to-server fallback for the client-side checkout flow in
// app/api/orders/verify/route.js. That flow works standalone, but if the
// browser closes, crashes, or loses network right after Razorpay captures a
// payment and before the checkout `handler` fires (or before its POST to
// /verify completes), the Order would otherwise stay CREATED forever with no
// tag ever issued despite the customer having paid. Razorpay retries this
// webhook until it gets a 2xx, so it's the reliable catch-all for that case.
//
// Configure this URL + a webhook secret in the Razorpay Dashboard's Webhooks
// section, then save that same secret at /admin/settings (or
// RAZORPAY_WEBHOOK_SECRET) — it's independent from the API key/secret pair.
export async function POST(request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");

  let valid;
  try {
    valid = await verifyWebhookSignature({ rawBody, signature });
  } catch (err) {
    if (err instanceof RazorpayError) {
      console.error("[razorpay webhook] verification unavailable:", err.message);
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
    throw err;
  }

  if (!valid) {
    console.warn("[razorpay webhook] signature mismatch");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const event = JSON.parse(rawBody);

  // order.paid is the one event guaranteed to carry both the order and
  // payment entities together; payment.captured fires for the same payment
  // but issuePaidTag's atomic claim makes handling both harmless either way.
  if (event.event === "payment.captured" || event.event === "order.paid") {
    const payment = event.payload?.payment?.entity;
    const orderId = payment?.order_id ?? event.payload?.order?.entity?.id;

    if (orderId) {
      const order = await prisma.order.findUnique({ where: { razorpayOrderId: orderId } });
      if (order) {
        await issuePaidTag(order, { razorpayPaymentId: payment?.id });
      }
    }
  }

  // Always 200 once the signature checks out, even for events we don't act
  // on — a non-2xx tells Razorpay to keep retrying this delivery forever.
  return NextResponse.json({ ok: true });
}
