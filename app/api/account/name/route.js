import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/db";

const MAX_NAME_LENGTH = 100;

export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";

  if (name.length > MAX_NAME_LENGTH) {
    return NextResponse.json({ error: "That name is too long." }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { name: name || null },
  });

  return NextResponse.json({
    user: { id: updated.id, phone: updated.phone, name: updated.name, role: updated.role },
  });
}
