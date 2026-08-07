import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/db";
import { isFree } from "@/lib/products";

// The database is the single source of truth for prices. Every server path that
// charges money must price the order from here — the client only ever sends a slug.

// Storefront: live products only.
export const listProducts = cache(async () => {
  return prisma.product.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } });
});

// Admin: everything, retired products included.
export const listAllProducts = cache(async () => {
  return prisma.product.findMany({ orderBy: [{ active: "desc" }, { sortOrder: "asc" }] });
});

export const getProduct = cache(async (slug) => {
  if (typeof slug !== "string" || !slug) return null;
  return prisma.product.findUnique({ where: { slug } });
});

// Is the product a Tag row records free? Free-ness is a price of zero in the
// Product table, never a slug comparison — an admin can make any product free.
// A slug with no product row left is treated as paid, since only the paid tiers
// are ever retired. Use this anywhere a feature is gated on free vs paid, so the
// page rendering the UI and the API enforcing it can't disagree.
export async function productIsFree(slug) {
  const product = await getProduct(slug);
  return product ? isFree(product) : false;
}

// The same question asked once for a whole list of tags.
export async function freeProductSlugs() {
  const products = await listAllProducts();
  return new Set(products.filter(isFree).map((p) => p.slug));
}

// For checkout paths: a retired product must not be purchasable, even if someone
// still has its URL or an old page open.
export async function getPurchasableProduct(slug) {
  const product = await getProduct(slug);
  return product?.active ? product : null;
}

// For admin tables that show historical rows: an order or tag records the slug it
// was bought under, and that product may since have been renamed or retired.
export async function productNameMap() {
  const products = await listAllProducts();
  return new Map(products.map((p) => [p.slug, p.name]));
}

// How many orders and tags reference a slug — a product with either can't be
// deleted without orphaning that history.
export async function productUsage(slug) {
  const [orders, tags] = await Promise.all([
    prisma.order.count({ where: { product: slug } }),
    prisma.tag.count({ where: { product: slug } }),
  ]);
  return { orders, tags };
}
