import "server-only";
import { prisma } from "@/lib/db";
import { generateTagCode } from "@/lib/tagCode";

// Pulls only the fields a Tag actually stores, so nothing extra from a request
// body (or a stored order payload) leaks into the row.
export function sanitizeCustomer(input) {
  const source = input ?? {};
  const str = (v) => (typeof v === "string" ? v.trim() : "");
  return {
    name: str(source.name),
    phone: str(source.phone),
    email: str(source.email) || null,
    vehicleReg: str(source.vehicleReg) || null,
    vehicleMakeModel: str(source.vehicleMakeModel) || null,
    address: str(source.address) || null,
    notes: str(source.notes) || null,
  };
}

async function uniqueTagCode() {
  let code = generateTagCode();
  for (let attempt = 0; attempt < 5; attempt++) {
    const clash = await prisma.tag.findUnique({ where: { code } });
    if (!clash) break;
    code = generateTagCode();
  }
  return code;
}

export async function createTag({ customer, product, userId }) {
  const code = await uniqueTagCode();
  return prisma.tag.create({
    data: { ...sanitizeCustomer(customer), code, product, createdById: userId },
  });
}

// Admin-only: a tag with a code and a product but no owner and no customer
// details yet — meant to be printed and physically handed out, then claimed
// by whoever scans it first via claimTag().
export async function createBlankTag({ product }) {
  const code = await uniqueTagCode();
  return prisma.tag.create({ data: { code, product } });
}

// Assigns an unclaimed tag to the user who scanned and filled in their
// details. Callers must already have verified the tag exists and has no
// owner — this just writes the update.
export async function claimTag({ code, userId, customer }) {
  return prisma.tag.update({
    where: { code },
    data: { ...sanitizeCustomer(customer), createdById: userId, claimedAt: new Date() },
  });
}
