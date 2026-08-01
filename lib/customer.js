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

export const CUSTOMER_FIELDS = [
  { key: "name", label: "Full name", required: true },
  { key: "phone", label: "Phone number", required: true },
  { key: "email", label: "Email" },
  { key: "vehicleReg", label: "Vehicle registration no." },
  { key: "vehicleMakeModel", label: "Vehicle make & model" },
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
