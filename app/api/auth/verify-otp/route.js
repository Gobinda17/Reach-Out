import { NextResponse } from "next/server";
import { verifyOtp } from "@/lib/otp";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/session";
import { normalizePhone } from "@/lib/phone";

export async function POST(request) {
  const body = await request.json().catch(() => null);
  const phone = normalizePhone(body?.phone);
  const code = typeof body?.code === "string" ? body.code.trim() : "";

  if (!phone || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "Invalid phone number or code." }, { status: 400 });
  }

  const valid = await verifyOtp(phone, code);
  if (!valid) {
    return NextResponse.json({ error: "Incorrect or expired code." }, { status: 401 });
  }

  const user = await prisma.user.upsert({
    where: { phone },
    update: {},
    create: { phone },
  });

  await createSession(user);

  return NextResponse.json({
    user: { id: user.id, phone: user.phone, name: user.name, role: user.role },
  });
}
