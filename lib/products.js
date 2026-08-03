// Client-safe product helpers. Prices themselves live in the database (see
// lib/catalogue.js) so an admin can change them — nothing here holds an amount.

export const DEFAULT_PRODUCT_SLUG = "car-tag";

// Products that go on a vehicle, so every flow that issues one knows to ask for
// a plate and a type — the paid wizard, and the claim form for blank stock.
// Kept as a list rather than a slug comparison so adding, say, a truck tag is
// one entry and not a hunt through the components. The free eTag belongs here
// too: it's a vehicle tag as much as the paid ones (FreeEtagWizard asks for
// both), it just arrives as a PDF.
export const VEHICLE_PRODUCT_SLUGS = ["car-tag", "bike-tag", "free-etag"];

export function isVehicleProduct(slug) {
  return VEHICLE_PRODUCT_SLUGS.includes(slug);
}

// Presentation only, keyed by slug. Kept in code rather than the database
// because it's styling, not data an admin edits.
const PRODUCT_COLORS = {
  "car-tag": "from-indigo-500 to-indigo-600",
  "bike-tag": "from-violet-500 to-violet-600",
  "free-etag": "from-emerald-500 to-emerald-600",
};

export function productColor(slug) {
  return PRODUCT_COLORS[slug] ?? "from-slate-500 to-slate-600";
}

export function isFree(product) {
  return product.pricePaise === 0;
}

// Money as a plain amount. Use this for totals and charged amounts, where zero
// means "nothing yet" rather than "this is free".
export function formatAmount(paise) {
  return `₹${(paise / 100).toLocaleString("en-IN", {
    minimumFractionDigits: paise % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

// A product's price, where zero genuinely means the tag costs nothing.
export function formatInr(pricePaise) {
  return pricePaise === 0 ? "Free" : formatAmount(pricePaise);
}

// "199" / "199.50" → paise. Returns null if it isn't a usable amount, so callers
// can reject rather than silently storing NaN or a rounded-away value.
export function parseInrToPaise(input) {
  if (typeof input !== "string" && typeof input !== "number") return null;
  const raw = String(input).trim().replace(/[₹,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) return null;
  const paise = Math.round(Number(raw) * 100);
  return Number.isSafeInteger(paise) && paise >= 0 ? paise : null;
}
