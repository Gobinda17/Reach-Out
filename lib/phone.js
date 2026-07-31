// Login is restricted to Indian mobile numbers: +91 followed by a 10-digit
// number starting with 6-9.
const INDIAN_MOBILE = /^[6-9]\d{9}$/;

export const INDIAN_PHONE_ERROR =
  "Enter a valid Indian mobile number, e.g. +91 98765 43210.";

// Accepts 9876543210, 09876543210, 919876543210, +91 98765-43210, etc.
// Returns the number in E.164 form (+919876543210), or null if it isn't a
// valid Indian mobile number.
export function normalizeIndianPhone(input) {
  if (typeof input !== "string") return null;

  let digits = input.replace(/[\s()\-.]/g, "").replace(/^\+/, "");

  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);

  if (!INDIAN_MOBILE.test(digits)) return null;

  return `+91${digits}`;
}
