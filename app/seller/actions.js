"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSeller } from "@/lib/dal";
import { listProducts } from "@/lib/catalogue";
import { MAX_REQUEST_QUANTITY, MAX_OPEN_REQUESTS } from "@/lib/tagRequests";

function fail(message) {
  return { ok: false, error: message };
}

function done(message) {
  return { ok: true, message };
}

// A seller asking admin for blank stock. Creates the request only — no tags
// exist until an admin approves it (app/admin/actions.js's approveTagRequest).
export async function requestTags(_prevState, formData) {
  const seller = await getSeller();
  if (!seller) return fail("Not authorized.");

  const quantity = Number(formData.get("quantity"));
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_REQUEST_QUANTITY) {
    return fail(`Enter a quantity between 1 and ${MAX_REQUEST_QUANTITY}.`);
  }

  const product = String(formData.get("product") ?? "").trim();
  const products = await listProducts();
  if (!products.some((p) => p.slug === product)) return fail("Unknown product.");

  const note = String(formData.get("note") ?? "").trim().slice(0, 500);

  const open = await prisma.tagRequest.count({
    where: { sellerId: seller.id, status: "PENDING" },
  });
  if (open >= MAX_OPEN_REQUESTS) {
    return fail(
      `You already have ${open} requests waiting on admin. Cancel one, or wait for a decision, before raising another.`
    );
  }

  await prisma.tagRequest.create({
    data: { sellerId: seller.id, product, quantity, note: note || null },
  });

  revalidatePath("/seller");
  revalidatePath("/seller/requests");
  revalidatePath("/admin/requests");
  return done("Request sent to admin.");
}

// Withdraws a request that admin hasn't ruled on yet. Scoped to the caller's own
// requests — the id alone is not authority to touch a row.
export async function cancelTagRequest(_prevState, formData) {
  const seller = await getSeller();
  if (!seller) return fail("Not authorized.");

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return fail("Invalid request.");

  // sellerId in the where clause, not a fetch-then-compare: this can't approve
  // of someone else's row even for an instant.
  const removed = await prisma.tagRequest.deleteMany({
    where: { id, sellerId: seller.id, status: "PENDING" },
  });
  if (removed.count === 0) {
    return fail("That request is not yours, or admin has already decided it.");
  }

  revalidatePath("/seller");
  revalidatePath("/seller/requests");
  revalidatePath("/admin/requests");
  return done("Request withdrawn.");
}
