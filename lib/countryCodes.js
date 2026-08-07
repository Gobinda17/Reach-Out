// Small curated list of countries relevant to this product's user base — not
// an exhaustive ISO 3166 list. dialCode is the ITU E.164 country calling code.
//
// `nsnLengths` is how many digits the national (subscriber) number has for
// mobiles in that country, which is NOT 10 everywhere — a Qatari or Singaporean
// mobile is 8 digits. Assuming 10 makes those numbers impossible to enter at
// all, so every phone input must size itself from this.
export const COUNTRIES = [
  { iso2: "IN", name: "India", dialCode: "91", nsnLengths: [10] },
  { iso2: "US", name: "United States / Canada", dialCode: "1", nsnLengths: [10] },
  { iso2: "GB", name: "United Kingdom", dialCode: "44", nsnLengths: [10] },
  { iso2: "AE", name: "United Arab Emirates", dialCode: "971", nsnLengths: [9] },
  { iso2: "SA", name: "Saudi Arabia", dialCode: "966", nsnLengths: [9] },
  { iso2: "QA", name: "Qatar", dialCode: "974", nsnLengths: [8] },
  { iso2: "OM", name: "Oman", dialCode: "968", nsnLengths: [8] },
  { iso2: "KW", name: "Kuwait", dialCode: "965", nsnLengths: [8] },
  { iso2: "AU", name: "Australia", dialCode: "61", nsnLengths: [9] },
  { iso2: "SG", name: "Singapore", dialCode: "65", nsnLengths: [8] },
  { iso2: "NP", name: "Nepal", dialCode: "977", nsnLengths: [10] },
  { iso2: "BD", name: "Bangladesh", dialCode: "880", nsnLengths: [10] },
  { iso2: "PK", name: "Pakistan", dialCode: "92", nsnLengths: [10] },
  { iso2: "LK", name: "Sri Lanka", dialCode: "94", nsnLengths: [9] },
];

// Longest number the country accepts — for maxLength on the input.
export function maxNsnLength(country) {
  return Math.max(...country.nsnLengths);
}

// Is this a complete national number for the country? Used to decide when the
// field has enough digits to compose an E.164 value.
export function isCompleteNsn(country, digits) {
  return country.nsnLengths.includes(digits.length);
}

// e.g. "10-digit mobile number" / "8-digit mobile number"
export function nsnPlaceholder(country) {
  return `${country.nsnLengths.join(" or ")}-digit mobile number`;
}

// This product's home market — the safe fallback whenever detection fails
// or lands on a country we don't list.
const DEFAULT_ISO2 = "IN";

export function flagEmoji(iso2) {
  return iso2
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

export function findCountry(iso2) {
  return COUNTRIES.find((c) => c.iso2 === iso2) ?? findCountry(DEFAULT_ISO2);
}

// proxy.js reads the visitor's IP-derived country from whatever geo header
// the host puts there (see GEO_COUNTRY_HEADERS below) and drops it in this
// cookie on every response — readable here without threading a prop through
// every form that embeds PhoneField. Far more reliable than locale, since it
// reflects where the request actually came from rather than a browser
// setting that travels with the device.
const GEO_COOKIE_NAME = "geo_country";

function geoCountryFromCookie() {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${GEO_COOKIE_NAME}=([^;]+)`));
  const value = match?.[1]?.toUpperCase();
  return value && COUNTRIES.some((c) => c.iso2 === value) ? value : null;
}

// Best-effort guess at the visitor's country: the IP-derived geo cookie when
// proxy.js's host actually set one (see above), otherwise DEFAULT_ISO2. This
// product's users are overwhelmingly Indian, so "unknown" defaults to India
// rather than guessing from the browser's locale — a device's language
// setting travels with it and is a poor proxy for where the visitor actually
// is (a bare "en" with no region, a non-Indian OS locale on a phone that's
// physically in India, a browser left on a language from a previous owner).
// Always a starting point the user can override via the country select, not
// a claim about who they are.
export function detectCountryIso2() {
  return geoCountryFromCookie() ?? DEFAULT_ISO2;
}

// Header names hosts/CDNs set from the visitor's IP, checked in order —
// first match wins. Vercel and Cloudflare both set these automatically at
// the edge with zero configuration; a plain self-hosted server behind
// neither won't have any of these, and detectCountryIso2() silently falls
// back to DEFAULT_ISO2. Used server-side only, by proxy.js.
const GEO_COUNTRY_HEADERS = ["x-vercel-ip-country", "cf-ipcountry"];

export function countryIso2FromRequestHeaders(headers) {
  for (const name of GEO_COUNTRY_HEADERS) {
    const value = headers.get(name)?.toUpperCase();
    if (value && COUNTRIES.some((c) => c.iso2 === value)) return value;
  }
  return null;
}

export { GEO_COOKIE_NAME };

// For useSyncExternalStore: the geo cookie never changes mid-session, so
// there's nothing to subscribe to — this just satisfies the API shape.
export function subscribeToLocale() {
  return () => {};
}

// The server (and the client's very first hydration pass, before it can read
// document.cookie) has no way to know the geo cookie's value, so both must
// agree on this fixed snapshot — otherwise React throws a hydration mismatch
// the moment the real client value differs from what the server rendered.
export function getServerCountryIso2() {
  return DEFAULT_ISO2;
}
