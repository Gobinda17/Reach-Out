import "server-only";
import { prisma } from "@/lib/db";
import { normalizePhone, PHONE_ERROR } from "@/lib/phone";
import { getPurchasableProduct } from "@/lib/catalogue";
import { isFree } from "@/lib/products";
import { VEHICLE_TYPES, ETAG_PRODUCT_SLUG } from "@/lib/etagShared";

export { VEHICLE_TYPES, ETAG_PRODUCT_SLUG };
// The OTP purpose for this flow. Distinct from "login" on purpose — see the
// note on verifyOtp in lib/otp.js.
export const ETAG_OTP_PURPOSE = "etag";

// This flow is public — no login — so a verified number is the only thing
// standing between it and a tag mint. Cap how many a single number can take.
export const MAX_ETAGS_PER_PHONE = 3;

// Indian plates, loosely: two letters, one or two digits, one or two letters,
// four digits (AS01GK9974). Kept permissive about spacing and case because
// people type plates however they like.
const VEHICLE_REG = /^[A-Z]{2}\s?\d{1,2}\s?[A-Z]{0,3}\s?\d{1,4}$/;

export function normalizeVehicleReg(input) {
  const value = String(input ?? "").trim().toUpperCase().replace(/[\s-]+/g, "");
  if (value.length < 5 || value.length > 13) return null;
  return VEHICLE_REG.test(value) ? value : null;
}

// One validator shared by both API routes, so the OTP step and the confirm step
// can never disagree about what counts as a valid submission. Returns
// { error } or { data }.
export async function readEtagFields(body) {
  const name = String(body?.name ?? "").trim();
  const email = String(body?.email ?? "").trim();
  const vehicleType = String(body?.vehicleType ?? "").trim();

  if (name.length < 2 || name.length > 100) return { error: "Enter your full name." };

  const phone = normalizePhone(body?.phone);
  if (!phone) return { error: PHONE_ERROR };

  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { error: "That email address doesn't look right." };
  }

  const vehicleReg = normalizeVehicleReg(body?.vehicleReg);
  if (!vehicleReg) return { error: "Enter a valid vehicle number, e.g. DL01AB1234." };

  if (!VEHICLE_TYPES.includes(vehicleType)) return { error: "Pick a vehicle type." };

  const product = await getPurchasableProduct(ETAG_PRODUCT_SLUG);
  if (!product) return { error: "The free eTag isn't available right now." };
  // Belt and braces: this endpoint mints without payment, so it must refuse to
  // hand out anything an admin has since given a price.
  if (!isFree(product)) return { error: "The free eTag isn't available right now." };

  return { data: { name, email: email || null, phone, vehicleReg, vehicleType, product } };
}

export async function etagCountForPhone(phone) {
  return prisma.tag.count({ where: { phone, product: ETAG_PRODUCT_SLUG } });
}
