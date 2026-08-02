// Client-safe plate helpers. The public scan page shows only the masked form —
// AS01GK#### — because the last four digits are the challenge that proves the
// visitor is actually standing in front of the vehicle. Printing the whole
// plate on that page would hand the answer to anyone who merely has the URL.

const LAST4 = /(\d{4})$/;

function tidy(reg) {
  return String(reg ?? "").toUpperCase().replace(/[\s-]+/g, "");
}

export function plateLast4(reg) {
  const match = tidy(reg).match(LAST4);
  return match ? match[1] : null;
}

// Everything before the final four digits: "AS01GK9974" → "AS01GK".
export function platePrefix(reg) {
  const value = tidy(reg);
  return plateLast4(value) ? value.slice(0, -4) : value;
}

export function maskPlate(reg) {
  const value = tidy(reg);
  if (!value) return null;
  return plateLast4(value) ? `${platePrefix(value)}####` : value;
}

// Whether this tag can pose the challenge at all. A door tag or business card
// has no plate, so those skip verification rather than block contact forever.
export function plateIsVerifiable(reg) {
  return Boolean(plateLast4(reg));
}

export function plateLast4Matches(reg, input) {
  const expected = plateLast4(reg);
  if (!expected) return false;
  return expected === String(input ?? "").replace(/\D/g, "");
}
