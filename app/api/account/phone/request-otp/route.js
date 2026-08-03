import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/dal";
import { requestOtp, OtpRateLimitError } from "@/lib/otp";
import { normalizePhone, PHONE_ERROR } from "@/lib/phone";
import { prisma } from "@/lib/db";

export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const phone = normalizePhone(body?.phone);

  if (!phone) {
    return NextResponse.json({ error: PHONE_ERROR }, { status: 400 });
  }
  if (phone === user.phone) {
    return NextResponse.json({ error: "That's already your number." }, { status: 400 });
  }

  const clash = await prisma.user.findUnique({ where: { phone } });
  if (clash && clash.id !== user.id) {
    return NextResponse.json(
      { error: "That number is already linked to another account." },
      { status: 409 }
    );
  }

  try {
    await requestOtp(phone, "change-phone");
  } catch (err) {
    if (err instanceof OtpRateLimitError) {
      return NextResponse.json(
        { error: err.message, retryAfterSeconds: err.retryAfterSeconds },
        { status: 429, headers: { "Retry-After": String(err.retryAfterSeconds ?? 60) } }
      );
    }
    throw err;
  }

  return NextResponse.json({ ok: true });
}
