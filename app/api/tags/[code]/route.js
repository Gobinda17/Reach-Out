import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/dal";
import { createScanToken } from "@/lib/scanToken";
import { maskPlate, platePrefix, plateIsVerifiable } from "@/lib/plate";
import { ETAG_PRODUCT_SLUG } from "@/lib/etagShared";

export async function GET(_request, { params }) {
  const { code } = await params;
  const upperCode = code.toUpperCase();

  const tag = await prisma.tag.findUnique({
    where: { code: upperCode },
  });

  if (!tag) {
    return NextResponse.json({ error: "Tag not found" }, { status: 404 });
  }

  // This is only ever called once the in-app scanner (app/(marketing)/scan)
  // has actually decoded a QR code or image, so — unlike the /t/[code] page,
  // which a <Link> elsewhere could prefetch — recording the scan here can't
  // be triggered by anything but a real lookup.
  const user = await getCurrentUser();
  await prisma.scan.create({
    data: { tagId: tag.id, scannedById: user?.id ?? null },
  });

  // Public lookup — never return the owner's name, phone, email, address or
  // notes, and never the full registration either. The last four digits are the
  // proof-of-presence challenge the contact endpoints check (lib/plateGate.js);
  // returning the plate here would hand the answer to anyone holding the code,
  // which is precisely who the challenge exists to stop. Only the masked form
  // and the prefix go out, exactly as on the /t/[code] page.
  //
  // scanToken is a short-lived, signed proof that this contact card was just
  // rendered — required by the call/message endpoints so they can't be
  // hammered directly with just the (public, printed) tag code.
  return NextResponse.json({
    maskedPlate: maskPlate(tag.vehicleReg),
    platePrefix: platePrefix(tag.vehicleReg),
    needsPlate: plateIsVerifiable(tag.vehicleReg),
    isFree: tag.product === ETAG_PRODUCT_SLUG,
    claimed: tag.createdById !== null,
    scanToken: await createScanToken(upperCode),
  });
}
