// Matches the admin bulk-generate cap — approving a request mints tags through
// the same one-at-a-time, collision-checked path.
export const MAX_REQUEST_QUANTITY = 200;
// A seller with several requests open at once gives admin no useful signal about
// what they actually need; raise the quantity on the open one instead.
export const MAX_OPEN_REQUESTS = 3;

// These live here rather than in app/seller/actions.js because a "use server"
// module may only export async functions — a plain const export there is a
// build error.

// Shared between the admin queue and the seller's own history so a request
// never looks like two different things depending on who's reading it.
export const REQUEST_STATUS_PILL = {
  PENDING: "pill pill-soft pill-amber",
  APPROVED: "pill pill-soft pill-green",
  REJECTED: "pill pill-soft pill-red",
};

export const REQUEST_STATUS_LABEL = {
  PENDING: "Awaiting admin",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};
