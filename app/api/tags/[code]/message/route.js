import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/dal";

const MAX_MESSAGE_LENGTH = 1000;

export async function POST(request, { params }) {
  const { code } = await params;
  const body = await request.json().catch(() => null);

  const message = typeof body?.message === "string" ? body.message.trim() : "";
  const fromName = typeof body?.fromName === "string" ? body.fromName.trim() : "";
  const fromPhone = typeof body?.fromPhone === "string" ? body.fromPhone.trim() : "";

  if (!message) {
    return NextResponse.json({ error: "Write a message before sending." }, { status: 400 });
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: "That message is too long." }, { status: 400 });
  }

  const tag = await prisma.tag.findUnique({
    where: { code: code.toUpperCase() },
    select: { id: true, createdById: true },
  });
  if (!tag) {
    return NextResponse.json({ error: "Tag not found" }, { status: 404 });
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
      fromName: fromName || null,
      fromPhone: fromPhone || null,
      fromUserId: user?.id ?? null,
    },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
