// Seeds the staff accounts and the product catalogue. Safe to re-run: staff are
// upserted by phone and products by slug, so nothing is duplicated.
//
// Products were previously created by hand in the admin, which meant a fresh
// database came up with an empty storefront and /generate had nothing to sell.
//
//   npm run db:seed
//
// Log in at /login with the phone printed below. With OTP_DEV_MODE="true" the
// code is always 111111; otherwise the SMS stub prints the real code to the
// server log.
import { PrismaClient } from "@prisma/client";
import { normalizePhone } from "../lib/phone.js";

const prisma = new PrismaClient();

// The whole catalogue: two paid tags and the free eTag. Prices are in paise.
// `update` deliberately leaves pricePaise and active alone — an admin who
// changes a price at /admin/products must not have it reset by a re-seed.
const PRODUCTS = [
  {
    slug: "car-tag",
    name: "Car Tag",
    description:
      "A tag for your car. Anyone who scans it can reach you without seeing your number.",
    pricePaise: 19900,
    sortOrder: 1,
  },
  {
    slug: "bike-tag",
    name: "Bike Tag",
    description:
      "A tag for your bike or scooter. Same private call and message, smaller sticker.",
    pricePaise: 19900,
    sortOrder: 2,
  },
  {
    slug: "free-etag",
    name: "Free eTag",
    description: "A free digital tag, delivered as a PDF. Print it yourself — nothing is posted.",
    pricePaise: 0,
    sortOrder: 3,
  },
];

const STAFF = [
  {
    envKey: "SEED_SUPERADMIN_PHONE",
    fallback: "+919000000000",
    name: "Super admin",
    role: "SUPERADMIN",
  },
  { envKey: "SEED_ADMIN_PHONE", fallback: "+919000000001", name: "Admin", role: "ADMIN" },
  { envKey: "SEED_SALES_PHONE", fallback: "+919000000002", name: "Seller", role: "SALES" },
];

async function main() {
  for (const product of PRODUCTS) {
    const row = await prisma.product.upsert({
      where: { slug: product.slug },
      update: { name: product.name, description: product.description, sortOrder: product.sortOrder },
      create: { ...product, active: true },
    });
    console.log(`  product     ${row.slug.padEnd(10)}  ${row.pricePaise / 100} INR  (${row.name})`);
  }

  for (const staff of STAFF) {
    const raw = process.env[staff.envKey] || staff.fallback;
    const phone = normalizePhone(raw);

    // A number login can't parse would be an account that could never sign in.
    if (!phone) {
      throw new Error(
        `${staff.envKey}="${raw}" is not a valid phone number — the ${staff.role} account could not sign in. Use 10 digits for India, or include a country code like +1.`
      );
    }

    const user = await prisma.user.upsert({
      where: { phone },
      update: { role: staff.role, name: staff.name },
      create: { phone, role: staff.role, name: staff.name },
    });

    console.log(`  ${staff.role.padEnd(10)}  ${user.phone}  (${user.name})`);
  }

  console.log("\nLog in at /login with any of these numbers.");
  console.log(
    process.env.OTP_DEV_MODE === "true"
      ? "OTP_DEV_MODE is on — the code is 111111."
      : "OTP_DEV_MODE is off — check the server log for the code."
  );
}

try {
  await main();
} catch (err) {
  console.error(err.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
