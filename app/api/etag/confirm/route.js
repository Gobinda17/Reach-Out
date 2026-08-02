import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { verifyOtp } from "@/lib/otp";
import { createTag } from "@/lib/tags";
import { sendWhatsAppEtag, whatsappConfigured } from "@/lib/sms";
import {
  readEtagFields,
  etagCountForPhone,
  ETAG_OTP_PURPOSE,
  MAX_ETAGS_PER_PHONE,
} from "@/lib/etag";

// Step 4b: the code came back, so the visitor holds that number. Mint the tag.
export async function POST(request) {
  const body = await request.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code.trim() : "";

  // Re-validated from scratch rather than trusted from the previous call —
  // this endpoint is reachable directly, and the earlier request proves nothing
  // about what's in this one.
  const { error, data } = await readEtagFields(body);
  if (error) return NextResponse.json({ error }, { status: 400 });

  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "Enter the 6-digit code." }, { status: 400 });
  }
  // Purpose-scoped: a login code can't stand in for this one, and this one can't
  // be replayed at /api/auth/verify-otp to take over the account.
  if (!(await verifyOtp(data.phone, code, ETAG_OTP_PURPOSE))) {
    return NextResponse.json({ error: "Incorrect or expired code." }, { status: 401 });
  }

  if ((await etagCountForPhone(data.phone)) >= MAX_ETAGS_PER_PHONE) {
    return NextResponse.json(
      { error: `This number already has ${MAX_ETAGS_PER_PHONE} free eTags.` },
      { status: 429 }
    );
  }

  // The verified number is the account, exactly as it is for login: a phone
  // that proves it holds a code owns whatever it creates. No session is issued
  // here — that would turn an eTag code into a login by the back door.
  const owner = await prisma.user.upsert({
    where: { phone: data.phone },
    update: {},
    create: { phone: data.phone, name: data.name },
  });

  const tag = await createTag({
    customer: {
      name: data.name,
      phone: data.phone,
      email: data.email,
      vehicleReg: data.vehicleReg,
      // The wizard collects a type rather than a free-text make/model; this is
      // the field that describes the vehicle, and it's what prints on the card.
      vehicleMakeModel: data.vehicleType,
      // Deliberately no address: a PDF eTag ships nothing, and an addressless
      // tag stays out of the admin Fulfillment queue (which filters on address).
    },
    product: data.product.slug,
    userId: owner.id,
  });

  const hdrs = await headers();
  const host = hdrs.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
  const url = `${protocol}://${host}/t/${tag.code}`;

  const delivered = await sendWhatsAppEtag(data.phone, { code: tag.code, url });

  return NextResponse.json(
    { code: tag.code, url, delivered, whatsappConfigured: whatsappConfigured() },
    { status: 201 }
  );
}
