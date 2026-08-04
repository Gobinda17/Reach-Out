import { NextResponse } from "next/server";
import { verifyOtp } from "@/lib/otp";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/session";
import { normalizePhone } from "@/lib/phone";
import { isStaffRole } from "@/lib/roles";
import { recordActivity, ACTIVITY } from "@/lib/activityLog";

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

  const existing = await prisma.user.findUnique({ where: { phone } });
  const user = existing ?? (await prisma.user.create({ data: { phone } }));
  const isNewUser = !existing;

  await createSession(user);

  // Staff sign-ins only. Logging every customer login would turn an ops audit
  // trail into surveillance of the people the product exists to protect, and
  // would bury the entries a super admin actually needs in noise.
  if (isStaffRole(user.role)) {
    await recordActivity(user, ACTIVITY.AUTH_STAFF_LOGIN, {
      summary: `${user.phone} signed in as ${user.role}`,
      targetType: "user",
      targetLabel: user.phone,
    });
  }

  return NextResponse.json({
    user: { id: user.id, phone: user.phone, name: user.name, role: user.role },
    isNewUser,
  });
}
