import Link from "next/link";
import { prisma } from "@/lib/db";
import { getAdmin } from "@/lib/dal";
import { RoleSelect } from "@/components/admin/RoleSelect";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { UserForm } from "@/components/admin/UserForm";
import { ROLES, ADMIN_ROLES, ROLE_LABEL, isAdminRole, isPrivilegedRole } from "@/lib/roles";
import { deleteUser } from "../actions";

const ROLE_PILL = {
  SUPERADMIN: "pill pill-soft pill-red",
  ADMIN: "pill pill-soft pill-amber",
  SALES: "pill pill-soft pill-green",
  CUSTOMER: "pill pill-soft",
};

// The admin layout handles the ADMIN-only guard for this route.
export default async function AdminUsersPage({ searchParams }) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.trim() : "";
  const where = query
    ? { OR: [{ phone: { contains: query } }, { name: { contains: query, mode: "insensitive" } }] }
    : {};

  const [admin, users, adminCount] = await Promise.all([
    getAdmin(),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        phone: true,
        name: true,
        role: true,
        createdAt: true,
        _count: { select: { tags: true, orders: true } },
      },
    }),
    prisma.user.count({ where: { role: { in: ADMIN_ROLES } } }),
  ]);

  // Only a super admin may grant or touch an admin-level role, so an ordinary
  // admin is never offered one. The server action enforces this independently —
  // this just keeps the UI honest about what will be accepted.
  const isSuper = admin?.role === "SUPERADMIN";
  const grantableRoles = isSuper ? ROLES : ROLES.filter((r) => !isPrivilegedRole(r));

  return (
    <>
    <article className="card">
      <header className="card-header">
        <div>
          <h2>Users</h2>
          <p>
            {query
              ? `${users.length} match${users.length === 1 ? "" : "es"} for “${query}”`
              : `${users.length} registered user${users.length === 1 ? "" : "s"}`}
            . Changing a role saves immediately; click a number to edit the account.
          </p>
        </div>
      </header>

      <form className="search-form">
        <input name="q" defaultValue={query} placeholder="Search phone or name." aria-label="Search users" />
        <button type="submit" className="pill-btn small">
          Search
        </button>
        {query && (
          <Link href="/admin/users" className="chip">
            Clear search
          </Link>
        )}
      </form>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Phone</th>
              <th>Name</th>
              <th>Current</th>
              <th>Change role</th>
              <th>Tags</th>
              <th>Orders</th>
              <th>Joined</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr>
                <td className="empty-row" colSpan={8}>
                  {query ? "No users match that search." : "No users yet."}
                </td>
              </tr>
            )}
            {users.map((u) => {
              const isSelf = u.id === admin?.id;
              const isLastAdmin = isAdminRole(u.role) && adminCount <= 1;
              const needsSuper = isPrivilegedRole(u.role) && !isSuper;
              const locked = isSelf || isLastAdmin || needsSuper;
              const lockReason = isSelf
                ? "You can't change your own role."
                : needsSuper
                  ? "Only a super admin can manage admin-level accounts."
                  : "This is the only admin-level account.";

              return (
                <tr key={u.id}>
                  <td className="mono">
                    <Link href={`/admin/users/${u.id}`} className="admin-link">
                      {u.phone}
                    </Link>
                    {isSelf && (
                      <span className="pill pill-soft" style={{ marginLeft: "0.4rem" }}>
                        you
                      </span>
                    )}
                  </td>
                  <td>{u.name || <span className="muted">—</span>}</td>
                  <td>
                    <span className={ROLE_PILL[u.role]}>{ROLE_LABEL[u.role] ?? u.role}</span>
                  </td>
                  <td>
                    <RoleSelect
                      userId={u.id}
                      role={u.role}
                      roles={grantableRoles}
                      disabled={locked}
                      disabledReason={lockReason}
                    />
                  </td>
                  <td className="muted">{u._count.tags}</td>
                  <td className="muted">{u._count.orders}</td>
                  <td className="muted">{u.createdAt.toLocaleDateString()}</td>
                  <td>
                    {locked || u._count.orders > 0 ? (
                      <span
                        className="muted"
                        title={
                          isSelf
                            ? "You can't delete your own account."
                            : needsSuper
                              ? "Only a super admin can delete admin-level accounts."
                              : isLastAdmin
                                ? "This is the only admin-level account."
                                : "Users with orders can't be deleted."
                        }
                      >
                        —
                      </span>
                    ) : (
                      <DeleteButton
                        action={deleteUser}
                        fields={{ id: u.id }}
                        confirmText={`Delete ${u.phone}? This cannot be undone.`}
                      />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </article>

    <article className="card">
      <header className="card-header">
        <div>
          <h2>Add a user</h2>
          <p>
            Create an account ahead of time — useful for staff.
            {!isSuper && " Only a super admin can create admin-level accounts."}
          </p>
        </div>
      </header>
      <UserForm roles={grantableRoles} />
    </article>
    </>
  );
}
