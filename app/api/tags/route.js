import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/dal";
import { isFree, DEFAULT_PRODUCT_SLUG } from "@/lib/products";
import { getPurchasableProduct } from "@/lib/catalogue";
import { createTag } from "@/lib/tags";
import { normalizePhone, PHONE_ERROR } from "@/lib/phone";
import { normalizeAddress, validateAddress } from "@/lib/customer";

// Free tags only. Paid products must go through /api/orders → /api/orders/verify,
// which issues the tag once Razorpay confirms the payment.
export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "You need to log in first." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
  const address = normalizeAddress(body?.address);

  if (!name || !phone) {
    return NextResponse.json({ error: "name and phone are required" }, { status: 400 });
  }
  if (!normalizePhone(phone)) {
    return NextResponse.json({ error: PHONE_ERROR }, { status: 400 });
  }
  // Nothing is posted for a free tag, so an address is optional here — but a
  // half-filled one is still refused rather than stored as an undeliverable
  // address the Fulfillment page would then pick up.
  const addressError = validateAddress(address, { required: false });
  if (addressError) {
    return NextResponse.json({ error: addressError }, { status: 400 });
  }

  const product = await getPurchasableProduct(body?.product ?? DEFAULT_PRODUCT_SLUG);
  if (!product) {
    return NextResponse.json({ error: "Unknown product." }, { status: 400 });
  }
  if (!isFree(product)) {
    return NextResponse.json(
      { error: `${product.name} is a paid tag — start a payment to get it.` },
      { status: 402 }
    );
  }

  const tag = await createTag({ customer: body, product: product.slug, userId: user.id });

  return NextResponse.json({ code: tag.code }, { status: 201 });
}
