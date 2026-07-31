import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_request, { params }) {
  const { code } = await params;

  const tag = await prisma.tag.findUnique({
    where: { code: code.toUpperCase() },
  });

  if (!tag) {
    return NextResponse.json({ error: "Tag not found" }, { status: 404 });
  }

  // Public lookup — never return the owner's name, phone, email, address, or
  // notes here. Only non-identifying vehicle context, so a scanner can
  // confirm they're looking at the right tag without learning who owns it.
  return NextResponse.json({
    vehicleReg: tag.vehicleReg ?? "",
    vehicleMakeModel: tag.vehicleMakeModel ?? "",
  });
}
