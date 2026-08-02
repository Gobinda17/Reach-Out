import "server-only";

// How much of a tag a seller is allowed to see. Deliberately omits name, phone,
// email, address, notes and the vehicle fields: a seller hands out blank stock,
// and the moment a customer claims one of those tags those details belong to
// the customer. The privacy model says only the owner and admin ops ever see
// them — a seller is neither. Keeping this in one place means a new seller view
// can't quietly widen it.
export const SELLER_TAG_SELECT = {
  code: true,
  product: true,
  claimedAt: true,
  assignedAt: true,
  createdAt: true,
  requestId: true,
};

// Every seller query is scoped through this, so "only their own data" is one
// definition rather than a where-clause repeated in each page.
export function sellerStockWhere(sellerId, extra = {}) {
  return { assignedToId: sellerId, ...extra };
}

// Stock a seller still physically holds vs. stock that has been handed out and
// activated by a customer. `claimedAt` is the divider: it's set once, when
// someone claims the tag, and later edits never rewrite it.
export const IN_STOCK = { claimedAt: null };
export const ACTIVATED = { claimedAt: { not: null } };

export function toSellerTagRow(tag, productName) {
  return {
    code: tag.code,
    productName,
    activated: Boolean(tag.claimedAt),
    assignedLabel: (tag.assignedAt ?? tag.createdAt).toLocaleDateString(),
    activatedLabel: tag.claimedAt ? tag.claimedAt.toLocaleDateString() : null,
  };
}
