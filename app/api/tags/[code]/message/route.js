import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/dal";
import { verifyScanToken } from "@/lib/scanToken";
import { checkMessageRateLimit, MessageRateLimitError } from "@/lib/callRateLimit";
import { normalizePhone, PHONE_ERROR } from "@/lib/phone";
import { checkPlateGate } from "@/lib/plateGate";
import { isValidReason, reasonLabel } from "@/lib/contactReasons";
import { sendScanNotification } from "@/lib/whatsapp";

const MAX_MESSAGE_LENGTH = 1000;
const MAX_NAME_LENGTH = 100;

export async function POST(request, { params }) {
  const { code } = await params;
  const upperCode = code.toUpperCase();
  const body = await request.json().catch(() => null);

  const typed = typeof body?.message === "string" ? body.message.trim() : "";
  const reason = isValidReason(body?.reason) ? body.reason : null;
  // Typing a message is optional: the reason picked on the contact card is
  // already a complete thing to say ("The vehicle is in no parking"), so it
  // stands in as the body. Only a request with neither is empty.
  const message = typed || (reason ? reasonLabel(reason) : "");
  const fromName = typeof body?.fromName === "string" ? body.fromName.trim() : "";
  const fromPhoneRaw = typeof body?.fromPhone === "string" ? body.fromPhone.trim() : "";

  if (!message) {
    return NextResponse.json(
      { error: "Pick a reason or write a message before sending." },
      { status: 400 }
    );
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: "That message is too long." }, { status: 400 });
  }
  if (fromName.length > MAX_NAME_LENGTH) {
    return NextResponse.json({ error: "That name is too long." }, { status: 400 });
  }
  // Optional — but if something was entered, it must be a real phone number
  // rather than arbitrary text, same as every other phone field in the app.
  const fromPhone = fromPhoneRaw ? normalizePhone(fromPhoneRaw) : "";
  if (fromPhoneRaw && !fromPhone) {
    return NextResponse.json({ error: PHONE_ERROR }, { status: 400 });
  }

  // Requires a fresh, signed token handed out when the contact card was
  // actually rendered (see lib/scanToken.js) — stops this endpoint being
  // hit directly with just the printed tag code, long after any real visit.
  if (!(await verifyScanToken(body?.scanToken, upperCode))) {
    return NextResponse.json(
      { error: "This session has expired. Reopen the tag to try again." },
      { status: 401 }
    );
  }

  const tag = await prisma.tag.findUnique({
    where: { code: upperCode },
    select: { id: true, createdById: true, vehicleReg: true, phone: true, name: true },
  });
  if (!tag) {
    return NextResponse.json({ error: "Tag not found" }, { status: 404 });
  }

  // Proves the sender is actually looking at the vehicle: the scan page only
  // ever shows AS01GK####, so the last four digits can't be read off the URL.
  const gate = checkPlateGate(upperCode, tag.vehicleReg, body?.plateLast4);
  if (gate) return gate;

  try {
    checkMessageRateLimit(upperCode);
  } catch (err) {
    if (err instanceof MessageRateLimitError) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    throw err;
  }

  // The scan page is public and anonymous by design, but a logged-in owner
  // messaging their own tag makes no sense and would just pollute their inbox.
  const user = await getCurrentUser();
  if (user && tag.createdById === user.id) {
    return NextResponse.json({ error: "You can't send a message to your own tag." }, { status: 400 });
  }

  await prisma.scanMessage.create({
    data: {
      tagId: tag.id,
      message,
      reason,
      fromName: fromName || null,
      fromPhone: fromPhone || null,
      fromUserId: user?.id ?? null,
    },
  });

  // Best-effort: the message is already saved and visible on the owner's
  // dashboard regardless of whether this notification goes through.
  if (tag.phone) {
    try {
      await sendScanNotification({
        to: tag.phone,
        reasonKey: reason,
        ownerName: tag.name,
        vehicleReg: tag.vehicleReg,
        note: typed || "No additional note was left.",
      });
    } catch (err) {
      console.error(`[whatsapp] notify failed for tag ${upperCode}:`, err);
    }
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
