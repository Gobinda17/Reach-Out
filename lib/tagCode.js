import { randomInt } from "node:crypto";

// Crockford base32, minus visually ambiguous chars (0/O, 1/I/L, U) — matches the tag code scheme
// used for physical QR/NFC tags across the Sampark technical docs.
const CROCKFORD = "23456789ABCDEFGHJKMNPQRSTVWXYZ";

export function generateTagCode(length = 6) {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += CROCKFORD[randomInt(CROCKFORD.length)];
  }
  return code;
}
