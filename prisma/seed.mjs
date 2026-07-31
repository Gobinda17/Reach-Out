// Seeds the two staff accounts. Safe to re-run: it upserts by phone, so an
// existing account is promoted to the right role rather than duplicated.
//
//   npm run db:seed
//
// Log in at /login with the phone printed below. With OTP_DEV_MODE="true" the
// code is always 111111; otherwise the SMS stub prints the real code to the
// server log.
import { PrismaClient } from "@prisma/client";
import { normalizePhone } from "../lib/phone.js";

const prisma = new PrismaClient();

const STAFF = [
  { envKey: "SEED_ADMIN_PHONE", fallback: "+919000000001", name: "Admin", role: "ADMIN" },
  { envKey: "SEED_SALES_PHONE", fallback: "+919000000002", name: "Seller", role: "SALES" },
];

async function main() {
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

    console.log(`  ${staff.role.padEnd(5)}  ${user.phone}  (${user.name})`);
  }

  console.log("\nLog in at /login with either number.");
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
