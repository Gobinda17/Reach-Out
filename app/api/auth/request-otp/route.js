import { NextResponse } from "next/server";
import { requestOtp, OtpRateLimitError } from "@/lib/otp";
import { normalizePhone, PHONE_ERROR } from "@/lib/phone";

export async function POST(request) {
  const body = await request.json().catch(() => null);
  const phone = normalizePhone(body?.phone);

  if (!phone) {
    return NextResponse.json({ error: PHONE_ERROR }, { status: 400 });
  }

  try {
    await requestOtp(phone);
  } catch (err) {
    if (err instanceof OtpRateLimitError) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    throw err;
  }

  return NextResponse.json({ ok: true });
}
