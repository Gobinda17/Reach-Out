// Small curated list of countries relevant to this product's user base — not
// an exhaustive ISO 3166 list. dialCode is the ITU E.164 country calling code.
export const COUNTRIES = [
  { iso2: "IN", name: "India", dialCode: "91" },
  { iso2: "US", name: "United States / Canada", dialCode: "1" },
  { iso2: "GB", name: "United Kingdom", dialCode: "44" },
  { iso2: "AE", name: "United Arab Emirates", dialCode: "971" },
  { iso2: "SA", name: "Saudi Arabia", dialCode: "966" },
  { iso2: "QA", name: "Qatar", dialCode: "974" },
  { iso2: "OM", name: "Oman", dialCode: "968" },
  { iso2: "KW", name: "Kuwait", dialCode: "965" },
  { iso2: "AU", name: "Australia", dialCode: "61" },
  { iso2: "SG", name: "Singapore", dialCode: "65" },
  { iso2: "NP", name: "Nepal", dialCode: "977" },
  { iso2: "BD", name: "Bangladesh", dialCode: "880" },
  { iso2: "PK", name: "Pakistan", dialCode: "92" },
  { iso2: "LK", name: "Sri Lanka", dialCode: "94" },
];

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

// Browser-only best-effort guess from the user's locale (e.g. "en-IN" -> IN).
// Never trust this alone — it's just a starting point the user can override,
// since VPNs, travel, and browsers that only expose a bare language tag
// ("en", no region) all make it unreliable on its own.
export function detectCountryIso2() {
  if (typeof navigator === "undefined") return DEFAULT_ISO2;
  const candidates = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const locale of candidates) {
    const region = locale?.split("-")[1]?.toUpperCase();
    if (region && COUNTRIES.some((c) => c.iso2 === region)) return region;
  }
  return DEFAULT_ISO2;
}

// For useSyncExternalStore: locale never changes mid-session, so there's
// nothing to subscribe to — this just satisfies the API shape.
export function subscribeToLocale() {
  return () => {};
}

// The server (and the client's very first hydration pass) has no
// navigator.language, so both must agree on this fixed snapshot — otherwise
// React throws a hydration mismatch the moment the real client value differs
// from what the server rendered.
export function getServerCountryIso2() {
  return DEFAULT_ISO2;
}
