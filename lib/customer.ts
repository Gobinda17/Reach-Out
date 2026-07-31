export type Customer = {
  name: string;
  phone: string;
  email: string;
  vehicleReg: string;
  vehicleMakeModel: string;
  address: string;
  notes: string;
};

export const emptyCustomer: Customer = {
  name: "",
  phone: "",
  email: "",
  vehicleReg: "",
  vehicleMakeModel: "",
  address: "",
  notes: "",
};

export const CUSTOMER_FIELDS: { key: keyof Customer; label: string; required?: boolean }[] = [
  { key: "name", label: "Full name", required: true },
  { key: "phone", label: "Phone number", required: true },
  { key: "email", label: "Email" },
  { key: "vehicleReg", label: "Vehicle registration no." },
  { key: "vehicleMakeModel", label: "Vehicle make & model" },
  { key: "address", label: "Address" },
  { key: "notes", label: "Notes" },
];

// A QR code's payload is a URL like `${origin}/t/AB12CD`. This pulls the
// short tag code back out, whether the scanned text is a full URL or a bare code.
const TAG_CODE_PATTERN = /(?:\/t\/)?([23456789ABCDEFGHJKMNPQRSTVWXYZ]{6})\/?$/;

export function extractTagCode(scannedText: string): string | null {
  const match = scannedText.trim().toUpperCase().match(TAG_CODE_PATTERN);
  return match ? match[1] : null;
}
