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

  return NextResponse.json({
    name: tag.name,
    phone: tag.phone,
    email: tag.email ?? "",
    vehicleReg: tag.vehicleReg ?? "",
    vehicleMakeModel: tag.vehicleMakeModel ?? "",
    address: tag.address ?? "",
    notes: tag.notes ?? "",
  });
}
