import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { decrypt } from "@/lib/session";

const PROTECTED_PREFIXES = ["/generate", "/admin", "/dashboard", "/invoices"];
// Claiming a tag requires an account — same as any other logged-in action —
// but /t/:code itself must stay public for anonymous scanners.
const CLAIM_ROUTE = /^\/t\/[^/]+\/claim$/;

export default async function proxy(request) {
  const { pathname } = request.nextUrl;
  const isProtected =
    CLAIM_ROUTE.test(pathname) || PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (!isProtected) return NextResponse.next();

  const cookie = (await cookies()).get("session")?.value;
  const session = await decrypt(cookie);

  if (!session?.userId) {
    const loginUrl = new URL("/login", request.url);
    // Keep the query string too — /generate?product=vehicle-tag must survive the
    // login round trip, otherwise the chosen product is lost.
    loginUrl.searchParams.set("next", pathname + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith("/admin") && session.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/generate", "/admin/:path*", "/dashboard", "/invoices/:path*", "/t/:code/claim"],
};
