"use client";

import { useEffect } from "react";

// Records that this tag was actually viewed in a browser. Deliberately a
// no-op render — see app/api/tags/[code]/scan/route.js for why this isn't
// done during the page's server render instead.
export function ScanBeacon({ code }) {
  useEffect(() => {
    fetch(`/api/tags/${code}/scan`, { method: "POST" }).catch(() => {});
  }, [code]);

  return null;
}
