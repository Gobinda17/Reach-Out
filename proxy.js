import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { decrypt } from "@/lib/session";
import { ADMIN_ROLES, isStaffRole } from "@/lib/roles";
import { comingSoonEnabled, isComingSoonAllowed } from "@/lib/comingSoon";

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

  // --- Holding page ---------------------------------------------------------
  // With COMING_SOON=true the whole site answers with /coming-soon, except for
  // login (so staff can get in) and for staff who already have. Deployed with
  // the flag off, none of this runs.
  if (comingSoonEnabled() && !isComingSoonAllowed(pathname)) {
    const staffCookie = (await cookies()).get("session")?.value;
    const staffSession = await decrypt(staffCookie);

    if (!isStaffRole(staffSession?.role)) {
      // API callers get JSON — rewriting them to an HTML page would hand back
      // markup where a client is parsing JSON, which reads as a crash rather
      // than a closed site.
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Reach-Out isn't open yet." }, { status: 503 });
      }
      // A rewrite, not a redirect: the visitor keeps the URL they came for, so
      // a QR code someone already printed still points somewhere sensible once
      // the flag comes off.
      return NextResponse.rewrite(new URL("/coming-soon", request.url));
    }
  }

  // --- Auth and role gates --------------------------------------------------
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
  // The holding page has to be able to answer for any path, so this is now a
  // catch-all with the static plumbing excluded — without those exclusions the
  // proxy would sit in front of CSS, JS and images too and could blank the very
  // page it's serving. Everything the auth gate cares about is still inside it.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
