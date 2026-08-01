import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/dal";

// Fired by the client once the tag page has actually mounted in a browser —
// kept out of the page's server render so Next.js prefetching a <Link> to
// /t/[code] (e.g. from the dashboard's own tag list) can't inflate scan counts.
export async function POST(_request, { params }) {
  const { code } = await params;

  const tag = await prisma.tag.findUnique({
    where: { code: code.toUpperCase() },
    select: { id: true },
  });
  if (!tag) {
    return NextResponse.json({ error: "Tag not found" }, { status: 404 });
  }

  const user = await getCurrentUser();

  await prisma.scan.create({
    data: { tagId: tag.id, scannedById: user?.id ?? null },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
