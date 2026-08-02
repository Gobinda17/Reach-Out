// Client-safe half of the free-eTag flow. lib/etag.js is "server-only" (it
// touches Prisma), so anything the wizard needs in the browser lives here —
// same split as lib/products.js vs lib/catalogue.js.

export const VEHICLE_TYPES = ["Car", "Bike", "Scooter", "Truck"];

export const ETAG_PRODUCT_SLUG = "free-etag";
