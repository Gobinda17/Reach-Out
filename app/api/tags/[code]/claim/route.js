import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/dal";
import { claimTag } from "@/lib/tags";

// Assigns an admin-bulk-generated (unowned) tag to whoever fills in their
// details for it first. Once a tag has an owner, it can't be re-claimed —
// the admin tag-edit form is the only way to reassign it after that.
export async function POST(request, { params }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "You need to log in first." }, { status: 401 });
  }

  const { code } = await params;
  const upperCode = code.toUpperCase();

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
  const address = typeof body?.address === "string" ? body.address.trim() : "";

  if (!name || !phone || !address) {
    return NextResponse.json({ error: "name, phone, and address are required" }, { status: 400 });
  }

  const tag = await prisma.tag.findUnique({
    where: { code: upperCode },
    select: { code: true, createdById: true },
  });
  if (!tag) {
    return NextResponse.json({ error: "Tag not found" }, { status: 404 });
  }
  if (tag.createdById) {
    return NextResponse.json({ error: "This tag has already been claimed." }, { status: 409 });
  }

  await claimTag({ code: tag.code, userId: user.id, customer: body });

  return NextResponse.json({ code: tag.code });
}
