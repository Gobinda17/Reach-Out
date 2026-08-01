import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/dal";
import { createScanToken } from "@/lib/scanToken";

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

  // Public lookup — never return the owner's name, phone, email, address, or
  // notes here. Only non-identifying vehicle context, so a scanner can
  // confirm they're looking at the right tag without learning who owns it.
  // scanToken is a short-lived, signed proof that this contact card was just
  // rendered — required by the call/message endpoints so they can't be
  // hammered directly with just the (public, printed) tag code.
  return NextResponse.json({
    vehicleReg: tag.vehicleReg ?? "",
    vehicleMakeModel: tag.vehicleMakeModel ?? "",
    claimed: tag.createdById !== null,
    scanToken: await createScanToken(upperCode),
  });
}
