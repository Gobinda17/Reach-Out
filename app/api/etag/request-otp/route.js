import { NextResponse } from "next/server";
import { requestOtp, OtpRateLimitError } from "@/lib/otp";
import { verifyCaptcha } from "@/lib/captcha";
import {
  readEtagFields,
  etagCountForPhone,
  ETAG_OTP_PURPOSE,
  MAX_ETAGS_PER_PHONE,
} from "@/lib/etag";

// Step 4a of the free-eTag wizard: check everything, then send a code to the
// WhatsApp number so we know the visitor actually holds it. No tag exists yet.
export async function POST(request) {
  const body = await request.json().catch(() => null);

  // Captcha first — it exists to stop a script reaching the OTP sender at all,
  // so validating it after the expensive work would defeat the point.
  if (!verifyCaptcha(body?.captchaToken, body?.captchaAnswer)) {
    return NextResponse.json(
      { error: "That answer isn't right. Try the sum again." },
      { status: 400 }
    );
  }

  const { error, data } = await readEtagFields(body);
  if (error) return NextResponse.json({ error }, { status: 400 });

  if ((await etagCountForPhone(data.phone)) >= MAX_ETAGS_PER_PHONE) {
    return NextResponse.json(
      {
        error: `This number already has ${MAX_ETAGS_PER_PHONE} free eTags. Order a physical tag from the shop for more.`,
      },
      { status: 429 }
    );
  }

  try {
    await requestOtp(data.phone, ETAG_OTP_PURPOSE);
  } catch (err) {
    if (err instanceof OtpRateLimitError) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    throw err;
  }

  return NextResponse.json({ ok: true, phone: data.phone });
}
