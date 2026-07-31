import { NextResponse } from "next/server";
import { requestOtp, OtpRateLimitError } from "@/lib/otp";

const E164 = /^\+[1-9]\d{7,14}$/;

export async function POST(request) {
  const body = await request.json().catch(() => null);
  const phone = typeof body?.phone === "string" ? body.phone.trim() : "";

  if (!E164.test(phone)) {
    return NextResponse.json(
      { error: "Enter a phone number in international format, e.g. +919876543210." },
      { status: 400 }
    );
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
