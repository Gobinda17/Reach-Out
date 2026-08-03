export const emptyCustomer = {
  name: "",
  phone: "",
  email: "",
  vehicleReg: "",
  vehicleMakeModel: "",
  address: "",
  notes: "",
};

// Joins the structured Indian-format fields collected on /generate into the
// single `address` string the Tag row actually stores. Always emits exactly
// four lines (blank ones included) so parseIndianAddress can split it back
// apart by position — filtering out empty lines here would make that lossy.
export function composeIndianAddress({ line1, line2, landmark, city, state, pincode }) {
  const cityState = [city, state].filter(Boolean).join(", ");
  const cityStateLine = [cityState, pincode].filter(Boolean).join(" - ");
  return [line1, line2, landmark, cityStateLine].join("\n");
}

// Reverses composeIndianAddress, so a previously saved address can refill the
// structured fields on /generate. Positional, not a general address parser —
// only reliable for strings this same function produced.
export function parseIndianAddress(address) {
  const empty = { line1: "", line2: "", landmark: "", city: "", state: "", pincode: "" };
  if (!address) return empty;

  const [line1 = "", line2 = "", landmark = "", cityStateLine = ""] = address.split("\n");
  const [cityState = "", pincode = ""] = cityStateLine.split(" - ");
  const [city = "", state = ""] = cityState.split(", ");

  return { line1, line2, landmark, city, state, pincode };
}

// Every part of a delivery address except the landmark is mandatory — a tag we
// have to post needs a complete one. Free products (the PDF eTag) ship nothing,
// so they're the one exception, expressed as `required: false` at the call site.
// Order matters: it's the order the fields appear in on the form, so a
// "what's missing" list reads top to bottom.
export const REQUIRED_ADDRESS_PARTS = ["line1", "line2", "city", "state", "pincode"];

// Short names, for error messages. The inputs carry the full wording as their
// placeholder ("Flat / House no., Building, Street"), which is too long to list
// in a sentence — and its own commas would make the list unreadable.
export const ADDRESS_PART_LABELS = {
  line1: "House / street",
  line2: "Locality",
  landmark: "Landmark",
  city: "City",
  state: "State",
  pincode: "PIN code",
};

export const ADDRESS_REQUIRED_ERROR = "A delivery address is required.";

// Indian PIN codes are six digits and never start with zero.
const PINCODE_PATTERN = /^[1-9]\d{5}$/;

// Per-part errors, keyed the same way the parts are — AddressFields renders
// these under each input, and the API routes reject on any of them, so the
// browser and the server can never disagree about what a complete address is.
// Returns {} when the address is good to post to.
export function addressPartErrors(parts) {
  const errors = {};
  for (const key of REQUIRED_ADDRESS_PARTS) {
    if (!String(parts?.[key] ?? "").trim()) errors[key] = `${ADDRESS_PART_LABELS[key]} is required.`;
  }
  const pincode = String(parts?.pincode ?? "").trim();
  if (pincode && !PINCODE_PATTERN.test(pincode)) {
    errors.pincode = "Enter a valid 6-digit PIN code.";
  }
  return errors;
}

// composeIndianAddress always emits its separators, so an untouched form still
// produces "\n\n\n" — never an empty string. This is what "nothing was typed"
// actually looks like once composed.
export function isBlankAddress(address) {
  return String(address ?? "").replace(/[\s,-]/g, "") === "";
}

// Tidies an address for storage, and turns "nothing was typed" into null.
// Trims each line rather than the whole string: composeIndianAddress's format
// is positional, so trimming a leading blank line off an address with no
// house/street would silently shift every other line up one — the locality
// would then read back as the street, and validation would blame the wrong
// field. Trailing blank lines are safe to drop, since a complete address
// always ends with its city/state/PIN line.
export function normalizeAddress(address) {
  if (typeof address !== "string" || isBlankAddress(address)) return null;
  return address
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .replace(/\n+$/, "");
}

// The one address check every boundary uses, on the composed string a Tag
// stores. Returns an error message, or null when the address is acceptable.
// `required: false` (free products) lets a blank address through — but a
// half-filled one is still rejected, since half an address posts nowhere.
export function validateAddress(address, { required = true } = {}) {
  if (isBlankAddress(address)) return required ? ADDRESS_REQUIRED_ERROR : null;

  const parts = parseIndianAddress(address);
  const errors = addressPartErrors(parts);

  const missing = REQUIRED_ADDRESS_PARTS.filter((key) => !String(parts[key] ?? "").trim());
  if (missing.length) {
    return `Enter a complete delivery address — still needed: ${missing
      .map((key) => ADDRESS_PART_LABELS[key])
      .join(", ")}.`;
  }

  // Everything is filled in, so anything left is a part that's filled in wrong
  // (today only the PIN code can be) — report that in its own words.
  const invalid = REQUIRED_ADDRESS_PARTS.find((key) => errors[key]);
  return invalid ? errors[invalid] : null;
}

export const CUSTOMER_FIELDS = [
  { key: "name", label: "Full name", required: true },
  { key: "phone", label: "Phone number", required: true },
  { key: "email", label: "Email" },
  { key: "vehicleReg", label: "Vehicle registration no." },
  // Holds a picked type ("Car", "Bike", …) rather than free-text make & model —
  // that's what every customer-facing flow writes, and what prints on the card.
  // The admin form keeps it a plain text input so old free-text values stay
  // editable rather than being snapped to one of the four choices.
  { key: "vehicleMakeModel", label: "Vehicle type" },
  { key: "address", label: "Address", required: true },
  { key: "notes", label: "Notes" },
];

// A QR code's payload is a URL like `${origin}/t/AB12CD`. This pulls the
// short tag code back out, whether the scanned text is a full URL or a bare code.
const TAG_CODE_PATTERN = /(?:\/t\/)?([23456789ABCDEFGHJKMNPQRSTVWXYZ]{6})\/?$/;

export function extractTagCode(scannedText) {
  const match = scannedText.trim().toUpperCase().match(TAG_CODE_PATTERN);
  return match ? match[1] : null;
}
