import "server-only";

// "Visitors" are the people who scan a tag — the anonymous side of the product.
//
// The privacy model runs in BOTH directions: the scanner never learns who owns
// the tag, and the owner never learns who scanned it. This page is for the
// operator, so it deliberately holds a third line: volume and behaviour, never
// identity. Concretely, none of the selects below reach for
//   • Scan.scannedById → a phone      (the schema says that column exists only
//     so a signed-in scanner can see their OWN history)
//   • ScanMessage.fromName / fromPhone (shared with the tag owner, not with us)
//   • ScanMessage.message              (the correspondence itself)
//   • Call.virtualNumber               (dialable, and tied to one caller)
//
// Keeping the allowlists here means a new visitors view can't quietly widen
// them, the same way lib/seller.js pins down what a seller may see.

export const VISITOR_SCAN_SELECT = {
  id: true,
  createdAt: true,
  // Read only to derive a signed-in/anonymous boolean; never rendered.
  scannedById: true,
  tag: { select: { code: true, product: true } },
};

export const VISITOR_MESSAGE_SELECT = {
  id: true,
  createdAt: true,
  fromPhone: true, // presence only → "shared contact"
  tag: { select: { code: true, product: true } },
};

export const VISITOR_CALL_SELECT = {
  id: true,
  createdAt: true,
  provider: true,
  status: true,
  tag: { select: { code: true, product: true } },
};

const tagBits = (row, productName) => ({
  id: row.id,
  code: row.tag?.code ?? "—",
  productName,
  when: row.createdAt.toLocaleString(),
});

export function toScanRow(row, productName) {
  return { ...tagBits(row, productName), signedIn: row.scannedById !== null };
}

export function toMessageRow(row, productName) {
  return { ...tagBits(row, productName), sharedContact: Boolean(row.fromPhone) };
}

export function toCallRow(row, productName) {
  return { ...tagBits(row, productName), provider: row.provider, status: row.status };
}

export function sinceDays(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}
