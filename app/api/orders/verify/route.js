import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/dal";
import { verifyPaymentSignature, RazorpayError } from "@/lib/razorpay";
import { issuePaidTag } from "@/lib/orders";

export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "You need to log in first." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const orderId = typeof body?.razorpay_order_id === "string" ? body.razorpay_order_id : "";
  const paymentId = typeof body?.razorpay_payment_id === "string" ? body.razorpay_payment_id : "";
  const signature = typeof body?.razorpay_signature === "string" ? body.razorpay_signature : "";

  if (!orderId || !paymentId || !signature) {
    return NextResponse.json({ error: "Incomplete payment details." }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { razorpayOrderId: orderId },
    include: { tag: true },
  });

  // Scoped to the logged-in user so one account can't claim another's order.
  if (!order || order.userId !== user.id) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  // Razorpay's success handler can fire more than once (retries, double-submit) —
  // return the tag already issued rather than minting a second one.
  if (order.status === "PAID" && order.tag) {
    return NextResponse.json({ code: order.tag.code, alreadyIssued: true });
  }

  let valid;
  try {
    valid = await verifyPaymentSignature({ orderId, paymentId, signature });
  } catch (err) {
    if (err instanceof RazorpayError) {
      console.error("[razorpay] verification unavailable:", err.message);
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    throw err;
  }

  if (!valid) {
    await prisma.order.update({
      where: { id: order.id },
      data: { status: "FAILED", razorpayPaymentId: paymentId },
    });
    console.warn(`[razorpay] signature mismatch for order ${orderId}`);
    return NextResponse.json({ error: "Payment could not be verified." }, { status: 400 });
  }

  const tag = await issuePaidTag(order, { razorpayPaymentId: paymentId });

  return NextResponse.json({ code: tag.code });
}
