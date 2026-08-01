import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/dal";
import { verifyOtp } from "@/lib/otp";
import { normalizePhone } from "@/lib/phone";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/session";

export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

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

  // Re-check — the number could have been claimed by someone else between
  // requesting the code and verifying it.
  const clash = await prisma.user.findUnique({ where: { phone } });
  if (clash && clash.id !== user.id) {
    return NextResponse.json(
      { error: "That number is already linked to another account." },
      { status: 409 }
    );
  }

  const updated = await prisma.user.update({ where: { id: user.id }, data: { phone } });

  // The session JWT carries the phone number, so it must be reissued or the
  // cookie would keep showing the old one until it expires.
  await createSession(updated);

  return NextResponse.json({
    user: { id: updated.id, phone: updated.phone, name: updated.name, role: updated.role },
  });
}
