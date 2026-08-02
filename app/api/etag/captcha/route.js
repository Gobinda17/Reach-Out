import { NextResponse } from "next/server";
import { issueCaptcha } from "@/lib/captcha";

// A fresh sum per request. This deliberately does NOT live in the page: as a
// server component the captcha was computed when the page rendered, which at
// build time meant one token baked into the HTML for every visitor, already
// expired 15 minutes after deploy. Fetching it when the wizard reaches the
// verify step also means a wrong answer can be retried with a new sum.
export async function GET() {
  return NextResponse.json(issueCaptcha(), {
    headers: { "Cache-Control": "no-store" },
  });
}
