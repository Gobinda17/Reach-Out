// Phone numbers are stored in E.164 (+<country><number>). Any country is
// accepted — a country code is not required in the input, because a bare local
// number is still assumed to be Indian for convenience and for the accounts
// that were created while login was India-only.

const E164 = /^\+[1-9]\d{7,14}$/;
const INDIAN_MOBILE = /^[6-9]\d{9}$/;

// Used when a bare local number is entered with no country code.
export const DEFAULT_COUNTRY_CODE = "91";

export const PHONE_ERROR =
  "Enter a valid phone number — 10 digits for India, or with a country code like +1 415 555 2671.";

// Accepts +14155552671, 0044 20 7946 0958, 9876543210, 09876543210,
// +91 98765-43210 … Returns E.164, or null if it isn't a usable number.
export function normalizePhone(input) {
  if (typeof input !== "string" && typeof input !== "number") return null;

  const raw = String(input).trim();
  let digits = raw.replace(/[\s()\-.]/g, "");

  // "00" is the international dialling prefix in much of the world.
  const hasCountryCode = digits.startsWith("+") || digits.startsWith("00");
  digits = digits.replace(/^\+/, "").replace(/^00/, "");

  if (!/^\d+$/.test(digits)) return null;

  if (!hasCountryCode) {
    // Bare digits are only read as a local Indian number. Without this, a typo
    // like "5876543210" would silently become "+587…" — a country code that
    // doesn't exist. Other countries need an explicit + or 00.
    if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
    if (digits.length === 12 && digits.startsWith(DEFAULT_COUNTRY_CODE)) {
      digits = digits.slice(2);
    }
    if (!INDIAN_MOBILE.test(digits)) return null;
    digits = DEFAULT_COUNTRY_CODE + digits;
  }

  const candidate = `+${digits}`;
  return E164.test(candidate) ? candidate : null;
}

// Telephony providers often hand back numbers with the country code
// stripped (e.g. edesy's masking webhook — see app/api/webhooks/edesy/route.js).
// Comparing the last 10 digits is the only reliable way to match those
// against our own E.164-stored numbers without assuming a specific country.
export function last10Digits(phone) {
  if (typeof phone !== "string") return null;
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : null;
}
