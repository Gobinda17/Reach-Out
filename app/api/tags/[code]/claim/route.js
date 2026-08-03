import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/dal";
import { claimTag } from "@/lib/tags";
import { normalizePhone, PHONE_ERROR } from "@/lib/phone";
import { normalizeAddress, validateAddress } from "@/lib/customer";
import { getProduct } from "@/lib/catalogue";
import { isFree, isVehicleProduct } from "@/lib/products";

// Assigns an admin-bulk-generated (unowned) tag to whoever fills in their
// details for it first. Once a tag has an owner, it can't be re-claimed —
// the admin tag-edit form is the only way to reassign it after that.
export async function POST(request, { params }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "You need to log in first." }, { status: 401 });
  }

  const { code } = await params;
  const upperCode = code.toUpperCase();

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
  const vehicleReg = typeof body?.vehicleReg === "string" ? body.vehicleReg.trim() : "";
  const address = normalizeAddress(body?.address);

  if (!name || !phone) {
    return NextResponse.json({ error: "name and phone are required" }, { status: 400 });
  }
  if (!normalizePhone(phone)) {
    return NextResponse.json({ error: PHONE_ERROR }, { status: 400 });
  }

  const tag = await prisma.tag.findUnique({
    where: { code: upperCode },
    select: { code: true, createdById: true, product: true },
  });
  if (!tag) {
    return NextResponse.json({ error: "Tag not found" }, { status: 404 });
  }
  if (tag.createdById) {
    return NextResponse.json({ error: "This tag has already been claimed." }, { status: 409 });
  }

  // What's mandatory follows the product, not the flow: only a free tag (a PDF)
  // posts nothing, and only a vehicle tag needs a plate. The claim page decides
  // the same way, but this endpoint is reachable directly, so it looks the
  // product up itself rather than trusting the form.
  const product = await getProduct(tag.product);

  if (isVehicleProduct(tag.product) && !vehicleReg) {
    return NextResponse.json(
      { error: "Your vehicle registration number is required." },
      { status: 400 }
    );
  }

  const addressError = validateAddress(address, { required: !product || !isFree(product) });
  if (addressError) {
    return NextResponse.json({ error: addressError }, { status: 400 });
  }

  await claimTag({ code: tag.code, userId: user.id, customer: body });

  return NextResponse.json({ code: tag.code });
}
