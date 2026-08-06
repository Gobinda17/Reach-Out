import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/dal";
import { allocateVirtualNumber, CallProviderError, callProviderIsDev } from "@/lib/calling";
import {
  checkCallRateLimit,
  CallRateLimitError,
  checkCallSpamGuard,
  CallInProgressError,
  CallCooldownError,
} from "@/lib/callRateLimit";
import { normalizePhone, PHONE_ERROR } from "@/lib/phone";
import { verifyScanToken } from "@/lib/scanToken";
import { checkPlateGate } from "@/lib/plateGate";
import { isValidReason } from "@/lib/contactReasons";

export async function POST(request, { params }) {
  const { code } = await params;
  const upperCode = code.toUpperCase();

  const tag = await prisma.tag.findUnique({
    where: { code: upperCode },
    select: { id: true, createdById: true, phone: true, vehicleReg: true },
  });
  if (!tag) {
    return NextResponse.json({ error: "Tag not found" }, { status: 404 });
  }

  // Same reasoning as the message endpoint: a logged-in owner calling their
  // own tag makes no sense.
  const user = await getCurrentUser();
  if (user && tag.createdById === user.id) {
    return NextResponse.json({ error: "You can't call your own tag." }, { status: 400 });
  }

  if (!tag.phone) {
    return NextResponse.json({ error: "This tag has no phone number on file." }, { status: 400 });
  }

  // Stored on the Call row below and used by app/api/webhooks/edesy/route.js
  // to decide who to bridge a masked call to at ring-time — the provider
  // itself is never told this number up front (see lib/calling.js). The dev
  // bypass doesn't use it, but we still require it here so the flow behaves
  // the same in dev and production.
  const body = await request.json().catch(() => null);
  const callerPhone = normalizePhone(body?.callerPhone);
  if (!callerPhone) {
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

  // Same challenge as the message endpoint — the caller has to have read the
  // plate off the vehicle, not just opened the link.
  const gate = checkPlateGate(upperCode, tag.vehicleReg, body?.plateLast4);
  if (gate) return gate;

  try {
    checkCallRateLimit(upperCode);
  } catch (err) {
    if (err instanceof CallRateLimitError) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    throw err;
  }

  try {
    await checkCallSpamGuard(tag.id);
  } catch (err) {
    if (err instanceof CallInProgressError || err instanceof CallCooldownError) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    throw err;
  }

  try {
    const { provider, virtualNumber, providerCallId, expiresAt } = await allocateVirtualNumber();

    const call = await prisma.call.create({
      data: {
        tagId: tag.id,
        initiatedById: user?.id ?? null,
        reason: isValidReason(body?.reason) ? body.reason : null,
        provider,
        virtualNumber,
        callerPhone,
        providerCallId,
        expiresAt,
      },
    });

    return NextResponse.json({
      sessionId: call.id,
      virtualNumber,
      expiresAt,
      devBypass: await callProviderIsDev(),
    });
  } catch (err) {
    if (err instanceof CallProviderError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    throw err;
  }
}
