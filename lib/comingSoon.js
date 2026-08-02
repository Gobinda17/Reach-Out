// Read by proxy.js, which runs in the edge runtime — so this file must stay
// free of Prisma and anything Node-only. That's also why this one flag is env
// only, unlike the settings an admin can flip from /admin/settings: the proxy
// can't reach the database to ask.

export function comingSoonEnabled() {
  return process.env.COMING_SOON === "true";
}

// Paths that keep working while the site is closed. Login and the auth API are
// open on purpose: without them nobody could sign in, and staff sign-in is the
// only way past the holding page (see isComingSoonBypass).
const ALLOWED = ["/coming-soon", "/login", "/api/auth/"];

export function isComingSoonAllowed(pathname) {
  return ALLOWED.some((p) => (p.endsWith("/") ? pathname.startsWith(p) : pathname === p));
}
