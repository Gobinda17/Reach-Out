// The one place that says what a role means. Deliberately free of "server-only"
// and of any DB import, so the proxy, Server Components, Server Actions and
// client components all read the same rules instead of each hard-coding a string
// comparison.

// Ordered most- to least-privileged; drives the role pickers in the admin UI.
export const ROLES = ["SUPERADMIN", "ADMIN", "SALES", "CUSTOMER"];

// Roles that can reach /admin at all.
export const ADMIN_ROLES = ["SUPERADMIN", "ADMIN"];

export function isAdminRole(role) {
  return ADMIN_ROLES.includes(role);
}

// Granting, changing or removing one of these roles is superadmin-only — it's
// the single thing that makes SUPERADMIN "super". An ordinary admin can still
// manage SALES and CUSTOMER accounts freely.
//
// Same list as ADMIN_ROLES today, but a different question: isAdminRole asks
// "can this person get in?", isPrivilegedRole asks "does touching this account
// require a superadmin?". Keep them separate so a future role that can reach
// /admin without being admin-level doesn't silently become unmanageable.
export function isPrivilegedRole(role) {
  return ADMIN_ROLES.includes(role);
}

// Anyone with a back-office account, as opposed to a customer. Used to decide
// whose sign-ins are worth auditing.
export function isStaffRole(role) {
  return isAdminRole(role) || role === "SALES";
}

export const ROLE_LABEL = {
  SUPERADMIN: "Super admin",
  ADMIN: "Admin",
  SALES: "Seller",
  CUSTOMER: "Customer",
};
