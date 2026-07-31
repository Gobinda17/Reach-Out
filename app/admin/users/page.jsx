import Link from "next/link";
import { prisma } from "@/lib/db";
import { getAdmin } from "@/lib/dal";
import { RoleSelect } from "@/components/admin/RoleSelect";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { UserForm } from "@/components/admin/UserForm";
import { deleteUser } from "../actions";

const ROLE_PILL = {
  ADMIN: "pill pill-soft pill-amber",
  SALES: "pill pill-soft pill-green",
  CUSTOMER: "pill pill-soft",
};

// The admin layout handles the ADMIN-only guard for this route.
export default async function AdminUsersPage() {
  const [admin, users, adminCount] = await Promise.all([
    getAdmin(),
    prisma.user.findMany({
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
    prisma.user.count({ where: { role: "ADMIN" } }),
  ]);

  return (
    <>
    <article className="card">
      <header className="card-header">
        <div>
          <h2>Users</h2>
          <p>
            {users.length} registered user{users.length === 1 ? "" : "s"}. Changing a role saves
            immediately; click a number to edit the account.
          </p>
        </div>
      </header>

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
            {users.map((u) => {
              const isSelf = u.id === admin?.id;
              const isLastAdmin = u.role === "ADMIN" && adminCount <= 1;
              const locked = isSelf || isLastAdmin;

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
                    <span className={ROLE_PILL[u.role]}>{u.role}</span>
                  </td>
                  <td>
                    <RoleSelect
                      userId={u.id}
                      role={u.role}
                      disabled={locked}
                      disabledReason={
                        isSelf ? "You can't change your own role." : "This is the only admin."
                      }
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
                            : isLastAdmin
                              ? "This is the only admin."
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
          <p>Create an account ahead of time — useful for staff.</p>
        </div>
      </header>
      <UserForm />
    </article>
    </>
  );
}
