import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { decrypt } from "@/lib/session";
import { ADMIN_ROLES } from "@/lib/roles";

const PROTECTED_PREFIXES = ["/generate", "/admin", "/seller", "/dashboard", "/invoices"];
// Staff areas, each pinned to the roles allowed in. Not the only gate — the
// matching layout re-checks server-side, and so does every Server Action.
const ROLE_AREAS = [
  { prefix: "/admin", roles: ADMIN_ROLES },
  { prefix: "/seller", roles: ["SALES"] },
];
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

  const area = ROLE_AREAS.find((a) => pathname.startsWith(a.prefix));
  if (area && !area.roles.includes(session.role)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/generate",
    "/admin/:path*",
    "/seller/:path*",
    "/dashboard",
    "/invoices/:path*",
    "/t/:code/claim",
  ],
};
