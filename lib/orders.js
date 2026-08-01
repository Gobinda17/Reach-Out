import "server-only";
import { prisma } from "@/lib/db";
import { createTag } from "@/lib/tags";

// Shared by the real Razorpay verification path and the RAZORPAY_DEV_MODE
// bypass — both end the same way: mint the tag the order paid for, then mark
// the order PAID and link the two.
export async function issuePaidTag(order, { razorpayPaymentId } = {}) {
  const tag = await createTag({
    customer: order.customerData,
    product: order.product,
    userId: order.userId,
  });

  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: "PAID",
      tagId: tag.id,
      ...(razorpayPaymentId ? { razorpayPaymentId } : {}),
    },
  });

  return tag;
}
