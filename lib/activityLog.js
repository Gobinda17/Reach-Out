import "server-only";
import { prisma } from "@/lib/db";

// Every action worth auditing, as a dotted key. The prefix before the dot is the
// group the /admin/activity tabs filter on, so a new action only has to pick the
// right prefix to show up in the right tab.
export const ACTIVITY = {
  USER_CREATE: "user.create",
  USER_UPDATE: "user.update",
  USER_ROLE: "user.role",
  USER_DELETE: "user.delete",

  PRODUCT_CREATE: "product.create",
  PRODUCT_UPDATE: "product.update",
  PRODUCT_PRICE: "product.price",
  PRODUCT_DELETE: "product.delete",

  TAG_UPDATE: "tag.update",
  TAG_GENERATE: "tag.generate",
  TAG_DELETE: "tag.delete",
  TAG_SHIPPED: "tag.shipped",
  TAG_DOWNLOADED: "tag.downloaded",

  REQUEST_CREATE: "request.create",
  REQUEST_CANCEL: "request.cancel",
  REQUEST_APPROVE: "request.approve",
  REQUEST_REJECT: "request.reject",

  SETTINGS_UPDATE: "settings.update",
  AUTH_STAFF_LOGIN: "auth.staff_login",
};

export const ACTIVITY_LABEL = {
  "user.create": "User created",
  "user.update": "User edited",
  "user.role": "Role changed",
  "user.delete": "User deleted",
  "product.create": "Product created",
  "product.update": "Product edited",
  "product.price": "Price changed",
  "product.delete": "Product deleted",
  "tag.update": "Tag edited",
  "tag.generate": "Tags generated",
  "tag.delete": "Tag deleted",
  "tag.shipped": "Tags shipped",
  "tag.downloaded": "Tags exported",
  "request.create": "Request raised",
  "request.cancel": "Request withdrawn",
  "request.approve": "Request approved",
  "request.reject": "Request rejected",
  "settings.update": "Settings saved",
  "auth.staff_login": "Staff signed in",
};

// Actions whose absence would be the first sign of something wrong, so they get
// their own tab rather than being buried in "All".
export const ACTIVITY_GROUPS = [
  { key: "all", label: "All", prefixes: null },
  { key: "users", label: "Users & roles", prefixes: ["user."] },
  { key: "tags", label: "Tags", prefixes: ["tag."] },
  { key: "requests", label: "Requests", prefixes: ["request."] },
  { key: "products", label: "Products", prefixes: ["product."] },
  { key: "security", label: "Security", prefixes: ["settings.", "auth."] },
];

export function groupWhere(group) {
  if (!group?.prefixes) return {};
  return { OR: group.prefixes.map((prefix) => ({ action: { startsWith: prefix } })) };
}

// Fire-and-forget. A failed audit write must never break — or roll back — the
// action it was describing, so this swallows its own errors to the server log.
// The trade-off is deliberate: a missing line is recoverable, a user-facing
// 500 on an otherwise successful role change is not.
export async function recordActivity(actor, action, { summary, targetType, targetLabel, metadata } = {}) {
  try {
    await prisma.activityLog.create({
      data: {
        actorId: actor?.id ?? null,
        actorPhone: actor?.phone ?? "system",
        actorRole: actor?.role ?? null,
        action,
        summary,
        targetType: targetType ?? null,
        targetLabel: targetLabel ? String(targetLabel) : null,
        metadata: metadata ?? undefined,
      },
    });
  } catch (err) {
    console.error(`[activity] failed to record "${action}":`, err);
  }
}

// Which fields a submitted object actually changes, by name only. Used so a tag
// edit records *that* the phone was changed without writing the number itself
// into the audit trail — see the privacy note in CLAUDE.md.
export function changedFields(before, after) {
  return Object.keys(after).filter((key) => (before[key] ?? null) !== (after[key] ?? null));
}
