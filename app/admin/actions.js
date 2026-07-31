"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getAdmin } from "@/lib/dal";
import { sanitizeCustomer } from "@/lib/tags";
import { parseInrToPaise, formatInr } from "@/lib/products";
import { productUsage } from "@/lib/catalogue";
import { normalizePhone, PHONE_ERROR } from "@/lib/phone";

const ROLES = ["ADMIN", "SALES", "CUSTOMER"];

function fail(message) {
  return { ok: false, error: message };
}

function done(message) {
  return { ok: true, message };
}

// Refuses to remove the last remaining admin — otherwise nobody could reach
// /admin again without a manual database edit.
async function isLastAdmin(userId) {
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (target?.role !== "ADMIN") return false;
  return (await prisma.user.count({ where: { role: "ADMIN" } })) <= 1;
}

// Creating a user here just reserves the phone number and role — there's no
// password to set. They sign in with an OTP to that number like anyone else.
export async function createUser(_prevState, formData) {
  const admin = await getAdmin();
  if (!admin) return fail("Not authorized.");

  const phone = normalizePhone(formData.get("phone"));
  const name = String(formData.get("name") ?? "").trim();
  const role = String(formData.get("role") ?? "CUSTOMER");

  if (!phone) return fail(PHONE_ERROR);
  if (!ROLES.includes(role)) return fail("Invalid role.");

  const clash = await prisma.user.findUnique({ where: { phone } });
  if (clash) return fail(`${phone} already has an account.`);

  const user = await prisma.user.create({ data: { phone, name: name || null, role } });

  revalidatePath("/admin/users");
  revalidatePath("/admin");
  return done(`Added ${user.phone} as ${role}. They can log in with an OTP to that number.`);
}

export async function updateUser(_prevState, formData) {
  const admin = await getAdmin();
  if (!admin) return fail("Not authorized.");

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return fail("Invalid user.");

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) return fail("User not found.");

  const phone = normalizePhone(formData.get("phone"));
  const name = String(formData.get("name") ?? "").trim();
  const role = String(formData.get("role") ?? "");

  if (!phone) return fail(PHONE_ERROR);
  if (!ROLES.includes(role)) return fail("Invalid role.");

  // Same rule as the inline role picker: an admin can't change their own role,
  // so they can't accidentally lock themselves out of /admin.
  if (id === admin.id && role !== existing.role) {
    return fail("You can't change your own role.");
  }
  if (role !== "ADMIN" && existing.role === "ADMIN" && (await isLastAdmin(id))) {
    return fail("This is the only admin — promote someone else first.");
  }

  if (phone !== existing.phone) {
    const clash = await prisma.user.findUnique({ where: { phone } });
    if (clash) return fail(`${phone} already belongs to another account.`);
  }

  const user = await prisma.user.update({
    where: { id },
    data: { phone, name: name || null, role },
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${id}`);
  revalidatePath("/admin");
  return done(`Saved ${user.phone}.`);
}

export async function updateUserRole(_prevState, formData) {
  const admin = await getAdmin();
  if (!admin) return fail("Not authorized.");

  const id = Number(formData.get("id"));
  const role = String(formData.get("role") ?? "");

  if (!Number.isInteger(id)) return fail("Invalid user.");
  if (!ROLES.includes(role)) return fail("Invalid role.");
  if (id === admin.id) return fail("You can't change your own role.");
  if (role !== "ADMIN" && (await isLastAdmin(id))) {
    return fail("This is the only admin — promote someone else first.");
  }

  const user = await prisma.user.update({ where: { id }, data: { role } });

  revalidatePath("/admin/users");
  revalidatePath("/admin");
  return done(`${user.phone} is now ${role}.`);
}

export async function deleteUser(_prevState, formData) {
  const admin = await getAdmin();
  if (!admin) return fail("Not authorized.");

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return fail("Invalid user.");
  if (id === admin.id) return fail("You can't delete your own account.");
  if (await isLastAdmin(id)) return fail("This is the only admin — promote someone else first.");

  // Orders reference users with ON DELETE RESTRICT, so a buyer can't be removed
  // without destroying their payment history. Say so instead of failing opaquely.
  const orderCount = await prisma.order.count({ where: { userId: id } });
  if (orderCount > 0) {
    return fail(
      `This user has ${orderCount} order${orderCount === 1 ? "" : "s"} — payment records can't be deleted.`
    );
  }

  const user = await prisma.user.delete({ where: { id } });

  revalidatePath("/admin/users");
  revalidatePath("/admin");
  return done(`Deleted ${user.phone}.`);
}

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function slugify(input) {
  return String(input ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Shared validation for create and update. Returns { error } or { data }.
function readProductFields(formData, { requireSlug }) {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const pricePaise = parseInrToPaise(formData.get("price"));
  const sortOrderRaw = String(formData.get("sortOrder") ?? "").trim();

  if (!name) return { error: "Name is required." };
  if (!description) return { error: "Description is required." };
  if (pricePaise === null) return { error: "Enter a price in rupees, e.g. 199 or 199.50." };
  if (pricePaise > 100_000_000) return { error: "That price looks wrong — the maximum is ₹10,00,000." };

  const sortOrder = sortOrderRaw === "" ? 0 : Number(sortOrderRaw);
  if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 9999) {
    return { error: "Sort order must be a whole number between 0 and 9999." };
  }

  const data = { name, description, pricePaise, sortOrder, active: formData.get("active") === "on" };

  if (requireSlug) {
    // Fall back to the name so the admin doesn't have to think about slugs.
    const slug = slugify(formData.get("slug") || name);
    if (!SLUG_PATTERN.test(slug)) {
      return { error: "Slug must be lowercase letters, numbers, and hyphens." };
    }
    data.slug = slug;
  }

  return { data };
}

export async function createProduct(_prevState, formData) {
  const admin = await getAdmin();
  if (!admin) return fail("Not authorized.");

  const { error, data } = readProductFields(formData, { requireSlug: true });
  if (error) return fail(error);

  const clash = await prisma.product.findUnique({ where: { slug: data.slug } });
  if (clash) return fail(`A product with the slug "${data.slug}" already exists.`);

  const product = await prisma.product.create({ data });

  revalidatePath("/admin/products");
  revalidatePath("/");
  revalidatePath("/generate");
  return done(`Created ${product.name} (${product.slug}).`);
}

export async function updateProduct(_prevState, formData) {
  const admin = await getAdmin();
  if (!admin) return fail("Not authorized.");

  const slug = String(formData.get("slug") ?? "");
  if (!slug) return fail("Invalid product.");

  const existing = await prisma.product.findUnique({ where: { slug } });
  if (!existing) return fail("Product not found.");

  // The slug is the key orders and tags recorded, so it stays fixed after creation.
  const { error, data } = readProductFields(formData, { requireSlug: false });
  if (error) return fail(error);

  const product = await prisma.product.update({ where: { slug }, data });

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${slug}`);
  revalidatePath("/");
  revalidatePath("/generate");
  return done(`Saved ${product.name}.`);
}

export async function deleteProduct(_prevState, formData) {
  const admin = await getAdmin();
  if (!admin) return fail("Not authorized.");

  const slug = String(formData.get("slug") ?? "");
  if (!slug) return fail("Invalid product.");

  const product = await prisma.product.findUnique({ where: { slug } });
  if (!product) return fail("Product not found.");

  // Orders and tags store the slug as plain text, so deleting a product that was
  // ever sold would leave that history showing a raw slug. Retire it instead.
  const { orders, tags } = await productUsage(slug);
  if (orders > 0 || tags > 0) {
    const parts = [];
    if (orders) parts.push(`${orders} order${orders === 1 ? "" : "s"}`);
    if (tags) parts.push(`${tags} tag${tags === 1 ? "" : "s"}`);
    return fail(`${product.name} has ${parts.join(" and ")} — untick "Available" to retire it instead.`);
  }

  await prisma.product.delete({ where: { slug } });

  revalidatePath("/admin/products");
  revalidatePath("/");
  revalidatePath("/generate");
  return done(`Deleted ${product.name}.`);
}

// Price is entered in rupees and stored in paise. Existing orders keep the
// amount they were charged, so this only affects future purchases.
export async function updateProductPrice(_prevState, formData) {
  const admin = await getAdmin();
  if (!admin) return fail("Not authorized.");

  const slug = String(formData.get("slug") ?? "");
  const pricePaise = parseInrToPaise(formData.get("price"));

  if (!slug) return fail("Invalid product.");
  if (pricePaise === null) {
    return fail("Enter an amount in rupees, e.g. 199 or 199.50.");
  }
  if (pricePaise > 100_000_000) {
    return fail("That price looks wrong — the maximum is ₹10,00,000.");
  }

  const existing = await prisma.product.findUnique({ where: { slug } });
  if (!existing) return fail("Product not found.");

  const product = await prisma.product.update({
    where: { slug },
    data: { pricePaise },
  });

  // Every surface that shows a price.
  revalidatePath("/admin/products");
  revalidatePath("/");
  revalidatePath("/generate");
  return done(`${product.name} is now ${formatInr(product.pricePaise)}.`);
}

export async function updateTag(_prevState, formData) {
  const admin = await getAdmin();
  if (!admin) return fail("Not authorized.");

  const code = String(formData.get("code") ?? "").toUpperCase();
  if (!code) return fail("Invalid tag.");

  const customer = sanitizeCustomer(Object.fromEntries(formData));
  if (!customer.name || !customer.phone) return fail("Name and phone are required.");

  const existing = await prisma.tag.findUnique({ where: { code } });
  if (!existing) return fail("Tag not found.");

  await prisma.tag.update({ where: { code }, data: customer });

  revalidatePath("/admin/tags");
  revalidatePath(`/admin/tags/${code}`);
  revalidatePath(`/t/${code}`);
  return done("Tag updated.");
}

export async function deleteTag(_prevState, formData) {
  const admin = await getAdmin();
  if (!admin) return fail("Not authorized.");

  const code = String(formData.get("code") ?? "").toUpperCase();
  if (!code) return fail("Invalid tag.");

  const tag = await prisma.tag.findUnique({ where: { code } });
  if (!tag) return fail("Tag not found.");

  // Order.tagId is ON DELETE SET NULL, so the paid order survives as a record
  // even though the tag it issued is gone.
  await prisma.tag.delete({ where: { code } });

  revalidatePath("/admin/tags");
  revalidatePath("/admin");
  return done(`Deleted tag ${code}.`);
}
