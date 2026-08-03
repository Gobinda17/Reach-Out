// Client-safe half of the free-eTag flow. lib/etag.js is "server-only" (it
// touches Prisma), so anything the wizard needs in the browser lives here —
// same split as lib/products.js vs lib/catalogue.js.

export const VEHICLE_TYPES = ["Car", "Bike", "Scooter", "Truck"];

export const ETAG_PRODUCT_SLUG = "free-etag";

// The type a product implies. Buying or claiming a Bike Tag shouldn't start you
// on "Car", so every flow that offers the chooser preselects from this. Values
// must be members of VEHICLE_TYPES — kept in this file so they can't drift.
const PRODUCT_VEHICLE_TYPES = {
  "car-tag": "Car",
  "bike-tag": "Bike",
};

export function defaultVehicleType(productSlug) {
  return PRODUCT_VEHICLE_TYPES[productSlug] ?? VEHICLE_TYPES[0];
}
