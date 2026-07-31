import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateTagCode } from "@/lib/tagCode";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";

  if (!name || !phone) {
    return NextResponse.json({ error: "name and phone are required" }, { status: 400 });
  }

  let code = generateTagCode();
  for (let attempt = 0; attempt < 5; attempt++) {
    const clash = await prisma.tag.findUnique({ where: { code } });
    if (!clash) break;
    code = generateTagCode();
  }

  const tag = await prisma.tag.create({
    data: {
      code,
      name,
      phone,
      email: body.email || null,
      vehicleReg: body.vehicleReg || null,
      vehicleMakeModel: body.vehicleMakeModel || null,
      address: body.address || null,
      notes: body.notes || null,
    },
  });

  return NextResponse.json({ code: tag.code }, { status: 201 });
}
