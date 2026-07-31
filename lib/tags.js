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

export async function createTag({ customer, product, userId }) {
  let code = generateTagCode();
  for (let attempt = 0; attempt < 5; attempt++) {
    const clash = await prisma.tag.findUnique({ where: { code } });
    if (!clash) break;
    code = generateTagCode();
  }

  return prisma.tag.create({
    data: { ...sanitizeCustomer(customer), code, product, createdById: userId },
  });
}
