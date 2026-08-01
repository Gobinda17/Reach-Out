"use client";

import { useEffect } from "react";

// Cosmetic only: swaps the visible address-bar URL to a generic one right
// after the tag page has actually loaded, so a casual screenshot or "look
// what's in my address bar" share doesn't hand out the tag code. This
// doesn't add real security — the QR still has to encode the real code to
// work at all, and it's still visible in the page source, the network tab,
// and on the physical tag itself. It just keeps it out of the one spot
// people glance at and screenshot without thinking.
export function HideCodeFromAddressBar() {
  useEffect(() => {
    window.history.replaceState(null, "", "/t/tag");
  }, []);

  return null;
}
