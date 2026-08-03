import "server-only";
import { prisma } from "@/lib/db";
import { createTag } from "@/lib/tags";

// Shared by the real Razorpay verification path, the Razorpay webhook, and the
// RAZORPAY_DEV_MODE bypass — all three end the same way: mint the tag the
// order paid for, then mark the order PAID and link the two.
//
// The client-side verify callback and the webhook can both arrive for the
// same payment (the webhook exists precisely to cover cases the callback
// misses), so this claims the order atomically first — only the caller whose
// conditional update actually flips a CREATED/FAILED row to PAID goes on to
// mint a tag; everyone else just returns the tag the first caller already made.
export async function issuePaidTag(order, { razorpayPaymentId } = {}) {
  const claim = await prisma.order.updateMany({
    where: { id: order.id, status: { not: "PAID" } },
    data: {
      status: "PAID",
      ...(razorpayPaymentId ? { razorpayPaymentId } : {}),
    },
  });

  if (claim.count === 0) {
    const existing = await prisma.order.findUnique({ where: { id: order.id }, include: { tag: true } });
    return existing?.tag ?? null;
  }

  const tag = await createTag({
    customer: order.customerData,
    product: order.product,
    userId: order.userId,
  });

  await prisma.order.update({ where: { id: order.id }, data: { tagId: tag.id } });

  return tag;
}
