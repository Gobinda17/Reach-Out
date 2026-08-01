import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/dal";
import { allocateVirtualNumber, CallProviderError, callProviderIsDev } from "@/lib/calling";
import { checkCallRateLimit, CallRateLimitError } from "@/lib/callRateLimit";

export async function POST(_request, { params }) {
  const { code } = await params;
  const upperCode = code.toUpperCase();

  const tag = await prisma.tag.findUnique({
    where: { code: upperCode },
    select: { id: true, createdById: true, phone: true },
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

  try {
    checkCallRateLimit(upperCode);
  } catch (err) {
    if (err instanceof CallRateLimitError) {
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
        provider,
        virtualNumber,
        providerCallId,
        expiresAt,
      },
    });

    return NextResponse.json({
      sessionId: call.id,
      virtualNumber,
      expiresAt,
      devBypass: callProviderIsDev(),
    });
  } catch (err) {
    if (err instanceof CallProviderError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    throw err;
  }
}
