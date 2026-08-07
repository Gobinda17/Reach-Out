import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { normalizePhone, PHONE_ERROR } from "@/lib/phone";

export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const raw = typeof body?.phone === "string" ? body.phone.trim() : "";

  // No OTP step here, unlike the account's own login number — this is just a
  // contact detail on the profile, not something used to authenticate.
  const emergencyPhone = raw ? normalizePhone(raw) : null;
  if (raw && !emergencyPhone) {
    return NextResponse.json({ error: PHONE_ERROR }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { emergencyPhone },
  });

  return NextResponse.json({ emergencyPhone: updated.emergencyPhone });
}
