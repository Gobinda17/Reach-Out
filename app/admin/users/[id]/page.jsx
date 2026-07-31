import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getAdmin } from "@/lib/dal";
import { productNameMap } from "@/lib/catalogue";
import { formatAmount } from "@/lib/products";
import { UserForm } from "@/components/admin/UserForm";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { deleteUser } from "../../actions";

const STATUS_PILL = {
  PAID: "pill pill-soft pill-green",
  CREATED: "pill pill-soft pill-amber",
  FAILED: "pill pill-soft pill-red",
};

export default async function AdminUserDetailPage({ params }) {
  const { id } = await params;
  const userId = Number(id);
  if (!Number.isInteger(userId)) notFound();

  const [user, admin, names] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      include: {
        orders: { orderBy: { createdAt: "desc" }, take: 10 },
        tags: { orderBy: { createdAt: "desc" }, take: 10 },
        // The lists above are capped at 10, so totals come from a real count.
        _count: { select: { orders: true, tags: true } },
      },
    }),
    getAdmin(),
    productNameMap(),
  ]);

  if (!user) notFound();

  const isSelf = user.id === admin?.id;
  const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
  const isLastAdmin = user.role === "ADMIN" && adminCount <= 1;
  const canDelete = !isSelf && !isLastAdmin && user._count.orders === 0;

  const facts = [
    ["Role", user.role],
    ["Joined", user.createdAt.toLocaleString()],
    ["Tags created", user._count.tags],
    ["Orders", user._count.orders],
  ];

  return (
    <>
      <article className="card">
        <header className="card-header">
          <div>
            <h2 className="mono">{user.phone}</h2>
            <p>
              <Link href="/admin/users" className="admin-link">
                ← All users
              </Link>
            </p>
          </div>
          <div className="chip-row" style={{ alignItems: "center" }}>
            {canDelete ? (
              <DeleteButton
                action={deleteUser}
                fields={{ id: user.id }}
                confirmText={`Delete ${user.phone}? This cannot be undone.`}
                label="Delete user"
              />
            ) : (
              <span className="pill pill-soft">
                {isSelf
                  ? "This is you"
                  : isLastAdmin
                    ? "Only admin — can't be deleted"
                    : "Has orders — can't be deleted"}
              </span>
            )}
          </div>
        </header>

        <dl className="meta-grid">
          {facts.map(([label, value]) => (
            <div key={label}>
              <dt className="meta-label">{label}</dt>
              <dd className="meta-value">{value}</dd>
            </div>
          ))}
        </dl>
      </article>

      <article className="card">
        <header className="card-header">
          <div>
            <h2>Edit account</h2>
            <p>
              Changing the phone number changes how they log in
              {isSelf ? " — including you." : "."}
            </p>
          </div>
        </header>
        <UserForm user={user} isSelf={isSelf} />
      </article>

      <article className="card">
        <header className="card-header">
          <div>
            <h2>Orders</h2>
            <p>Most recent first.</p>
          </div>
        </header>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Placed</th>
              </tr>
            </thead>
            <tbody>
              {user.orders.length === 0 ? (
                <tr>
                  <td className="empty-row" colSpan={4}>
                    No orders.
                  </td>
                </tr>
              ) : (
                user.orders.map((order) => (
                  <tr key={order.id}>
                    <td>{names.get(order.product) ?? order.product}</td>
                    <td>{formatAmount(order.amountPaise)}</td>
                    <td>
                      <span className={STATUS_PILL[order.status]}>{order.status}</span>
                    </td>
                    <td className="muted">{order.createdAt.toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </article>

      <article className="card">
        <header className="card-header">
          <div>
            <h2>Tags</h2>
            <p>Tags this account created.</p>
          </div>
        </header>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Product</th>
                <th>Name on tag</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {user.tags.length === 0 ? (
                <tr>
                  <td className="empty-row" colSpan={4}>
                    No tags.
                  </td>
                </tr>
              ) : (
                user.tags.map((tag) => (
                  <tr key={tag.id}>
                    <td className="mono">
                      <Link href={`/admin/tags/${tag.code}`} className="admin-link">
                        {tag.code}
                      </Link>
                    </td>
                    <td>{names.get(tag.product) ?? tag.product}</td>
                    <td>{tag.name}</td>
                    <td className="muted">{tag.createdAt.toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </article>
    </>
  );
}
