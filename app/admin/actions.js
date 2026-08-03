"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getAdmin } from "@/lib/dal";
import { sanitizeCustomer, createBlankTag } from "@/lib/tags";
import { parseInrToPaise, formatInr, isFree } from "@/lib/products";
import { productUsage, listProducts, getProduct } from "@/lib/catalogue";
import { isBlankAddress } from "@/lib/customer";
import { normalizePhone, PHONE_ERROR } from "@/lib/phone";
import { setSetting } from "@/lib/settings";
import { CALL_PROVIDERS } from "@/lib/calling";
import { ROLES, ADMIN_ROLES, isAdminRole, isPrivilegedRole } from "@/lib/roles";
import { recordActivity, changedFields, ACTIVITY } from "@/lib/activityLog";

function fail(message) {
  return { ok: false, error: message };
}

function done(message) {
  return { ok: true, message };
}

// Refuses to remove the last account that can reach /admin — otherwise nobody
// could get back in without a manual database edit.
async function isLastAdmin(userId) {
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!isAdminRole(target?.role)) return false;
  return (await prisma.user.count({ where: { role: { in: ADMIN_ROLES } } })) <= 1;
}

// Separately: never let the last superadmin go. Admin-level accounts can only be
// managed by a superadmin, so losing the last one would freeze the admin roster
// permanently even though /admin itself stayed reachable.
async function isLastSuperAdmin(userId) {
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (target?.role !== "SUPERADMIN") return false;
  return (await prisma.user.count({ where: { role: "SUPERADMIN" } })) <= 1;
}

// The one rule that distinguishes SUPERADMIN from ADMIN: only a superadmin may
// create, promote, demote or delete an admin-level account. Checked against both
// the current and the target role, so an ordinary admin can neither promote
// someone into admin nor touch an existing one.
async function guardPrivilegedRoles(actor, ...roles) {
  if (actor.role === "SUPERADMIN") return null;
  if (!roles.some((role) => isPrivilegedRole(role))) return null;
  return fail("Only a super admin can manage admin-level accounts.");
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

  const denied = await guardPrivilegedRoles(admin, role);
  if (denied) return denied;

  const clash = await prisma.user.findUnique({ where: { phone } });
  if (clash) return fail(`${phone} already has an account.`);

  const user = await prisma.user.create({ data: { phone, name: name || null, role } });

  await recordActivity(admin, ACTIVITY.USER_CREATE, {
    summary: `Created ${user.phone} as ${role}`,
    targetType: "user",
    targetLabel: user.phone,
    metadata: { role },
  });

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

  const denied = await guardPrivilegedRoles(admin, existing.role, role);
  if (denied) return denied;

  if (!isAdminRole(role) && (await isLastAdmin(id))) {
    return fail("This is the only admin-level account — promote someone else first.");
  }
  if (role !== "SUPERADMIN" && (await isLastSuperAdmin(id))) {
    return fail("This is the only super admin — promote someone else first.");
  }

  if (phone !== existing.phone) {
    const clash = await prisma.user.findUnique({ where: { phone } });
    if (clash) return fail(`${phone} already belongs to another account.`);
  }

  const user = await prisma.user.update({
    where: { id },
    data: { phone, name: name || null, role },
  });

  const changes = changedFields(existing, { phone, name: name || null, role });
  await recordActivity(admin, ACTIVITY.USER_UPDATE, {
    summary:
      changes.length === 0
        ? `Saved ${user.phone} with no changes`
        : `Edited ${user.phone} (${changes.join(", ")})`,
    targetType: "user",
    targetLabel: user.phone,
    metadata: { changed: changes, ...(changes.includes("role") ? { from: existing.role, to: role } : {}) },
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

  const existing = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (!existing) return fail("User not found.");

  const denied = await guardPrivilegedRoles(admin, existing.role, role);
  if (denied) return denied;

  if (!isAdminRole(role) && (await isLastAdmin(id))) {
    return fail("This is the only admin-level account — promote someone else first.");
  }
  if (role !== "SUPERADMIN" && (await isLastSuperAdmin(id))) {
    return fail("This is the only super admin — promote someone else first.");
  }

  const user = await prisma.user.update({ where: { id }, data: { role } });

  await recordActivity(admin, ACTIVITY.USER_ROLE, {
    summary: `Changed ${user.phone} from ${existing.role} to ${role}`,
    targetType: "user",
    targetLabel: user.phone,
    metadata: { from: existing.role, to: role },
  });

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

  const existing = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (!existing) return fail("User not found.");

  const denied = await guardPrivilegedRoles(admin, existing.role);
  if (denied) return denied;

  if (await isLastAdmin(id)) {
    return fail("This is the only admin-level account — promote someone else first.");
  }
  if (await isLastSuperAdmin(id)) {
    return fail("This is the only super admin — promote someone else first.");
  }

  // Orders reference users with ON DELETE RESTRICT, so a buyer can't be removed
  // without destroying their payment history. Say so instead of failing opaquely.
  const orderCount = await prisma.order.count({ where: { userId: id } });
  if (orderCount > 0) {
    return fail(
      `This user has ${orderCount} order${orderCount === 1 ? "" : "s"} — payment records can't be deleted.`
    );
  }

  const user = await prisma.user.delete({ where: { id } });

  await recordActivity(admin, ACTIVITY.USER_DELETE, {
    summary: `Deleted ${user.phone} (${user.role})`,
    targetType: "user",
    targetLabel: user.phone,
    metadata: { role: user.role },
  });

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

  await recordActivity(admin, ACTIVITY.PRODUCT_CREATE, {
    summary: `Created product ${product.name} at ${formatInr(product.pricePaise)}`,
    targetType: "product",
    targetLabel: product.slug,
    metadata: { pricePaise: product.pricePaise, active: product.active },
  });

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

  const productChanges = changedFields(existing, data);
  await recordActivity(admin, ACTIVITY.PRODUCT_UPDATE, {
    summary:
      productChanges.length === 0
        ? `Saved ${product.name} with no changes`
        : `Edited ${product.name} (${productChanges.join(", ")})`,
    targetType: "product",
    targetLabel: slug,
    metadata: {
      changed: productChanges,
      ...(productChanges.includes("pricePaise")
        ? { from: existing.pricePaise, to: product.pricePaise }
        : {}),
    },
  });

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

  await recordActivity(admin, ACTIVITY.PRODUCT_DELETE, {
    summary: `Deleted product ${product.name}`,
    targetType: "product",
    targetLabel: slug,
  });

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

  await recordActivity(admin, ACTIVITY.PRODUCT_PRICE, {
    summary: `Repriced ${product.name} from ${formatInr(existing.pricePaise)} to ${formatInr(
      product.pricePaise
    )}`,
    targetType: "product",
    targetLabel: slug,
    metadata: { from: existing.pricePaise, to: product.pricePaise },
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

  const existing = await prisma.tag.findUnique({ where: { code } });
  if (!existing) return fail("Tag not found.");

  // Unclaimed blank stock has no owner, so there is nothing to edit — and
  // filling these in from here would hand a tag an owner who never claimed it.
  // The detail page hides the form for these, but this action is reachable by
  // a direct POST, so it has to re-check rather than trust the UI.
  if (!existing.createdById) {
    return fail("This tag is unclaimed — contact details can only be edited once someone claims it.");
  }

  const customer = sanitizeCustomer(Object.fromEntries(formData));
  // Only claimed tags reach this point, and a claimed tag always has an owner
  // to reach, so neither field may be cleared.
  if (!customer.name || !customer.phone) {
    return fail("A claimed tag needs both a name and a phone number.");
  }
  if (!normalizePhone(customer.phone)) {
    return fail(PHONE_ERROR);
  }
  // Anything that isn't a free (PDF) tag gets posted, so its address may not be
  // emptied. Deliberately only a presence check, not the structured one the
  // customer-facing forms run: this field is a free-text textarea precisely so
  // an admin can correct an address into whatever shape the post office needs.
  const product = await getProduct(existing.product);
  if ((!product || !isFree(product)) && isBlankAddress(customer.address)) {
    return fail("A tag that gets posted needs a delivery address.");
  }

  await prisma.tag.update({ where: { code }, data: customer });

  // Field names only — the audit trail must not become a second copy of the
  // customer's contact details.
  await recordActivity(admin, ACTIVITY.TAG_UPDATE, {
    summary: `Edited contact details on tag ${code}`,
    targetType: "tag",
    targetLabel: code,
    metadata: { changed: changedFields(existing, customer) },
  });

  revalidatePath("/admin/tags");
  revalidatePath(`/admin/tags/${code}`);
  revalidatePath(`/t/${code}`);
  return done("Tag updated.");
}

// Bulk-creates blank, unowned tags for printing and physical distribution.
// Whoever scans one first can claim it — see claimTag() in lib/tags.js.
export async function bulkGenerateTags(_prevState, formData) {
  const admin = await getAdmin();
  if (!admin) return fail("Not authorized.");

  const count = Number(formData.get("count"));
  if (!Number.isInteger(count) || count < 1 || count > 200) {
    return fail("Enter a quantity between 1 and 200.");
  }

  const product = String(formData.get("product") ?? "").trim();
  const products = await listProducts();
  if (!products.some((p) => p.slug === product)) {
    return fail("Unknown product.");
  }

  const codes = [];
  for (let i = 0; i < count; i++) {
    const tag = await createBlankTag({ product });
    codes.push(tag.code);
  }

  await recordActivity(admin, ACTIVITY.TAG_GENERATE, {
    summary: `Generated ${count} blank ${product} tag${count === 1 ? "" : "s"}`,
    targetType: "product",
    targetLabel: product,
    metadata: { count, codes },
  });

  revalidatePath("/admin/tags");
  return { ok: true, message: `Generated ${count} unclaimed tag${count === 1 ? "" : "s"}.`, codes };
}

// Marks a batch of tags as physically shipped. Called directly from the
// Fulfillment page's selection UI as a plain async function (not a
// <form action>, since it operates on a dynamic set of checked rows) rather
// than through useActionState like the rest of this file.
export async function markTagsShipped(codes) {
  const admin = await getAdmin();
  if (!admin) return fail("Not authorized.");

  const list = Array.isArray(codes) ? codes.map((c) => String(c).toUpperCase()) : [];
  if (list.length === 0) return fail("No tags selected.");

  const result = await prisma.tag.updateMany({
    where: { code: { in: list }, shippedAt: null },
    data: { shippedAt: new Date() },
  });

  await recordActivity(admin, ACTIVITY.TAG_SHIPPED, {
    summary: `Marked ${result.count} tag${result.count === 1 ? "" : "s"} as shipped`,
    targetType: "tag",
    metadata: { count: result.count, codes: list },
  });

  revalidatePath("/admin/fulfillment");
  revalidatePath("/admin/tags");
  return { ok: true, message: `Marked ${result.count} tag${result.count === 1 ? "" : "s"} as shipped.` };
}

// Marks a batch of tags as downloaded, once their card ZIP has actually been
// exported — same direct-call pattern as markTagsShipped. Used by both export
// queues on the tags page: blank stock waiting to be printed (Unclaimed) and
// scan-claimed tags waiting to be posted (Registered).
export async function markTagsDownloaded(codes) {
  const admin = await getAdmin();
  if (!admin) return fail("Not authorized.");

  const list = Array.isArray(codes) ? codes.map((c) => String(c).toUpperCase()) : [];
  if (list.length === 0) return fail("No tags selected.");

  const result = await prisma.tag.updateMany({
    where: { code: { in: list } },
    data: { downloadedAt: new Date() },
  });

  await recordActivity(admin, ACTIVITY.TAG_DOWNLOADED, {
    summary: `Exported cards for ${result.count} tag${result.count === 1 ? "" : "s"}`,
    targetType: "tag",
    metadata: { count: result.count, codes: list },
  });

  revalidatePath("/admin/tags");
  return { ok: true, message: `Marked ${result.count} tag${result.count === 1 ? "" : "s"} as downloaded.` };
}

// Blank secret fields mean "leave unchanged" — the settings page never
// echoes a saved secret back into an input, so an empty submit must not be
// read as "clear it".
export async function updateSettings(_prevState, formData) {
  const admin = await getAdmin();
  if (!admin) return fail("Not authorized.");

  const callProvider = String(formData.get("callProvider") ?? "");
  if (!CALL_PROVIDERS.some((p) => p.key === callProvider)) {
    return fail("Unknown call provider.");
  }
  await setSetting("CALL_PROVIDER", callProvider);

  // Only the *names* of the secrets touched are recorded below — never a value.
  // An audit trail that quotes the API key it was protecting is worse than none.
  const rotated = [];

  const callmaskApiKey = String(formData.get("callmaskApiKey") ?? "").trim();
  if (callmaskApiKey) {
    await setSetting("CALLMASK_API_KEY", callmaskApiKey);
    rotated.push("CALLMASK_API_KEY");
  }

  const callmaskWebhookSecret = String(formData.get("callmaskWebhookSecret") ?? "").trim();
  if (callmaskWebhookSecret) {
    await setSetting("CALLMASK_WEBHOOK_SECRET", callmaskWebhookSecret);
    rotated.push("CALLMASK_WEBHOOK_SECRET");
  }

  const otpDevMode = formData.get("otpDevMode") === "on" ? "true" : "false";
  const razorpayDevMode = formData.get("razorpayDevMode") === "on" ? "true" : "false";
  await setSetting("OTP_DEV_MODE", otpDevMode);
  await setSetting("RAZORPAY_DEV_MODE", razorpayDevMode);

  const razorpayKeyId = String(formData.get("razorpayKeyId") ?? "").trim();
  if (razorpayKeyId) {
    await setSetting("RAZORPAY_KEY_ID", razorpayKeyId);
    rotated.push("RAZORPAY_KEY_ID");
  }

  const razorpayKeySecret = String(formData.get("razorpayKeySecret") ?? "").trim();
  if (razorpayKeySecret) {
    await setSetting("RAZORPAY_KEY_SECRET", razorpayKeySecret);
    rotated.push("RAZORPAY_KEY_SECRET");
  }

  const razorpayWebhookSecret = String(formData.get("razorpayWebhookSecret") ?? "").trim();
  if (razorpayWebhookSecret) {
    await setSetting("RAZORPAY_WEBHOOK_SECRET", razorpayWebhookSecret);
    rotated.push("RAZORPAY_WEBHOOK_SECRET");
  }

  await recordActivity(admin, ACTIVITY.SETTINGS_UPDATE, {
    summary: `Saved settings — call provider ${callProvider}, OTP dev mode ${otpDevMode}, Razorpay dev mode ${razorpayDevMode}${
      rotated.length ? `, rotated ${rotated.join(" and ")}` : ""
    }`,
    targetType: "settings",
    metadata: { callProvider, otpDevMode, razorpayDevMode, rotated },
  });

  revalidatePath("/admin/settings");
  return done("Settings saved.");
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

  await recordActivity(admin, ACTIVITY.TAG_DELETE, {
    summary: `Deleted tag ${code}`,
    targetType: "tag",
    targetLabel: code,
    metadata: { product: tag.product, wasClaimed: Boolean(tag.createdById) },
  });

  revalidatePath("/admin/tags");
  revalidatePath("/admin");
  return done(`Deleted tag ${code}.`);
}

// --- Seller tag requests -----------------------------------------------------

// Approving mints `quantity` blank tags and assigns them to the seller as
// stock; rejecting just records the decision. Both go through the same
// updateMany-with-status-guard so two admins clicking at once can't double-mint:
// whoever flips PENDING first wins, the other gets count 0 and stops.
async function decideTagRequest(formData, decision) {
  const admin = await getAdmin();
  if (!admin) return fail("Not authorized.");

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return fail("Invalid request.");

  const note = String(formData.get("decisionNote") ?? "").trim().slice(0, 500);

  const request = await prisma.tagRequest.findUnique({ where: { id } });
  if (!request) return fail("Request not found.");
  if (request.status !== "PENDING") return fail("That request has already been decided.");

  const claimed = await prisma.tagRequest.updateMany({
    where: { id, status: "PENDING" },
    data: {
      status: decision,
      decidedById: admin.id,
      decidedAt: new Date(),
      decisionNote: note || null,
    },
  });
  if (claimed.count === 0) return fail("That request has already been decided.");

  let message = `Rejected request #${id}.`;
  if (decision === "APPROVED") {
    for (let i = 0; i < request.quantity; i++) {
      await createBlankTag({
        product: request.product,
        assignedToId: request.sellerId,
        requestId: request.id,
      });
    }
    message = `Approved request #${id} — ${request.quantity} tag${
      request.quantity === 1 ? "" : "s"
    } assigned to the seller.`;
  }

  await recordActivity(
    admin,
    decision === "APPROVED" ? ACTIVITY.REQUEST_APPROVE : ACTIVITY.REQUEST_REJECT,
    {
      summary:
        decision === "APPROVED"
          ? `Approved request #${id} — ${request.quantity} ${request.product} tags to seller`
          : `Rejected request #${id} for ${request.quantity} ${request.product} tags`,
      targetType: "request",
      targetLabel: String(id),
      metadata: { quantity: request.quantity, product: request.product, sellerId: request.sellerId },
    }
  );

  revalidatePath("/admin/requests");
  revalidatePath("/admin/tags");
  revalidatePath("/admin");
  revalidatePath("/seller");
  revalidatePath("/seller/tags");
  revalidatePath("/seller/requests");
  return done(message);
}

export async function approveTagRequest(_prevState, formData) {
  return decideTagRequest(formData, "APPROVED");
}

export async function rejectTagRequest(_prevState, formData) {
  return decideTagRequest(formData, "REJECTED");
}
