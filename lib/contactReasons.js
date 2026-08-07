// Client-safe. Why someone is reaching the owner — picked before contact, sent
// with the message or call, and stored so the owner sees the reason without the
// sender having to type it out.
export const CONTACT_REASONS = [
  { key: "lights", icon: "💡", label: "Forgotten lights / keys in the vehicle" },
  { key: "no-parking", icon: "🅿️", label: "The vehicle is in no parking" },
  { key: "towing", icon: "🚚", label: "The vehicle is getting towed" },
  { key: "fault", icon: "⏱️", label: "Something wrong with the vehicle" },
  // Surfaced as its own button rather than a row in the list, but it travels
  // through exactly the same masked-contact path — nothing here dials an
  // emergency service.
  { key: "emergency", icon: "🚑", label: "Emergency", emergency: true },
];

export function reasonLabel(key) {
  return CONTACT_REASONS.find((r) => r.key === key)?.label ?? null;
}

export function isValidReason(key) {
  return CONTACT_REASONS.some((r) => r.key === key);
}

export function isEmergencyReason(key) {
  return CONTACT_REASONS.find((r) => r.key === key)?.emergency === true;
}
