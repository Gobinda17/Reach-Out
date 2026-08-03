import "server-only";
import { prisma } from "@/lib/db";
import { generateTagCode } from "@/lib/tagCode";
import { normalizePhone } from "@/lib/phone";
import { normalizeAddress } from "@/lib/customer";

// Pulls only the fields a Tag actually stores, so nothing extra from a request
// body (or a stored order payload) leaks into the row.
//
// phone is normalized to E.164 when it's a valid number, so every Tag row
// stores phone numbers in the same shape LoginForm/PhoneChangeForm/UserForm
// already do. An invalid-but-non-empty phone is kept as the raw trimmed
// string rather than silently dropped, so callers that require a valid
// phone can still see what was typed and reject it with a clear error
// (see the `normalizePhone(customer.phone)` checks at each API boundary
// that calls this) — sanitizeCustomer itself never rejects, it only shapes.
export function sanitizeCustomer(input) {
  const source = input ?? {};
  const str = (v) => (typeof v === "string" ? v.trim() : "");
  const rawPhone = str(source.phone);
  return {
    name: str(source.name),
    phone: rawPhone ? (normalizePhone(rawPhone) ?? rawPhone) : "",
    email: str(source.email) || null,
    vehicleReg: str(source.vehicleReg) || null,
    vehicleMakeModel: str(source.vehicleMakeModel) || null,
    // Not str(): an address is line-positional, so it gets its own normalizer.
    address: normalizeAddress(source.address),
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
// `assignedToId` hands the new tag to a seller as stock (set when an admin
// approves a TagRequest); left null it's house stock the admin holds.
export async function createBlankTag({ product, assignedToId = null, requestId = null }) {
  const code = await uniqueTagCode();
  return prisma.tag.create({
    data: {
      code,
      product,
      assignedToId,
      requestId,
      assignedAt: assignedToId ? new Date() : null,
    },
  });
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
