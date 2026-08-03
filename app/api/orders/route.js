import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/dal";
import { isFree, isVehicleProduct } from "@/lib/products";
import { getPurchasableProduct } from "@/lib/catalogue";
import { createRazorpayOrder, razorpayKeyId, paymentDevModeEnabled, RazorpayError } from "@/lib/razorpay";
import { sanitizeCustomer } from "@/lib/tags";
import { issuePaidTag } from "@/lib/orders";
import { normalizePhone, PHONE_ERROR } from "@/lib/phone";
import { validateAddress } from "@/lib/customer";

export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "You need to log in first." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const product = await getPurchasableProduct(body?.product);

  if (!product) {
    return NextResponse.json({ error: "Unknown product." }, { status: 400 });
  }
  if (isFree(product)) {
    return NextResponse.json(
      { error: `${product.name} is free — no payment needed.` },
      { status: 400 }
    );
  }

  const customer = sanitizeCustomer(body?.customer);
  if (!customer.name || !customer.phone) {
    return NextResponse.json({ error: "name and phone are required" }, { status: 400 });
  }
  if (!normalizePhone(customer.phone)) {
    return NextResponse.json({ error: PHONE_ERROR }, { status: 400 });
  }
  // The wizard's Vehicle step already asks for this, but a client-side check is
  // always bypassable — and a vehicle tag with no plate on it is useless.
  if (isVehicleProduct(product.slug) && !customer.vehicleReg) {
    return NextResponse.json(
      { error: "Your vehicle registration number is required." },
      { status: 400 }
    );
  }
  // Paid products are always posted, so a complete delivery address is
  // mandatory here — checked before any money is taken, since the order's
  // customerData is what issuePaidTag later mints the tag from.
  const addressError = validateAddress(customer.address);
  if (addressError) {
    return NextResponse.json({ error: addressError }, { status: 400 });
  }

  if (await paymentDevModeEnabled()) {
    console.warn("[razorpay] RAZORPAY_DEV_MODE is on — issuing the tag without a real payment.");

    const order = await prisma.order.create({
      data: {
        userId: user.id,
        product: product.slug,
        amountPaise: product.pricePaise,
        currency: "INR",
        razorpayOrderId: `dev_${randomUUID()}`,
        customerData: customer,
      },
    });

    const tag = await issuePaidTag(order);

    return NextResponse.json({ devBypass: true, code: tag.code });
  }

  try {
    // The amount comes from the catalogue in the database, never from the request.
    const rzpOrder = await createRazorpayOrder({
      amountPaise: product.pricePaise,
      notes: { product: product.slug, userId: String(user.id) },
    });

    await prisma.order.create({
      data: {
        userId: user.id,
        product: product.slug,
        amountPaise: product.pricePaise,
        currency: rzpOrder.currency ?? "INR",
        razorpayOrderId: rzpOrder.id,
        customerData: customer,
      },
    });

    return NextResponse.json({
      orderId: rzpOrder.id,
      amountPaise: product.pricePaise,
      currency: rzpOrder.currency ?? "INR",
      keyId: await razorpayKeyId(),
      product: { slug: product.slug, name: product.name },
    });
  } catch (err) {
    if (err instanceof RazorpayError) {
      console.error("[razorpay] order creation failed:", err.message);
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    throw err;
  }
}
