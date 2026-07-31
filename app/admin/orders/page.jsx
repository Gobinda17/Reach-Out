import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatAmount } from "@/lib/products";
import { productNameMap } from "@/lib/catalogue";

const STATUSES = ["ALL", "PAID", "CREATED", "FAILED"];

const STATUS_PILL = {
  PAID: "pill pill-soft pill-green",
  CREATED: "pill pill-soft pill-amber",
  FAILED: "pill pill-soft pill-red",
};

// Read-only by design: orders are the payment record. Editing or deleting them
// here would desync the app from what Razorpay actually charged — refunds belong
// in the Razorpay dashboard.
export default async function AdminOrdersPage({ searchParams }) {
  const { status } = await searchParams;
  const active = STATUSES.includes(status) ? status : "ALL";
  const where = active === "ALL" ? {} : { status: active };

  const names = await productNameMap();

  const [orders, totals] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { user: { select: { phone: true } }, tag: { select: { code: true } } },
    }),
    prisma.order.aggregate({ where, _sum: { amountPaise: true }, _count: { _all: true } }),
  ]);

  return (
    <article className="card">
      <header className="card-header">
        <div>
          <h2>Orders</h2>
          <p>
            {totals._count._all} order{totals._count._all === 1 ? "" : "s"} ·{" "}
            {formatAmount(totals._sum.amountPaise ?? 0)} total. Showing up to 100, newest first.
          </p>
        </div>
        <div className="chip-row">
          {STATUSES.map((s) => (
            <Link
              key={s}
              href={s === "ALL" ? "/admin/orders" : `/admin/orders?status=${s}`}
              className={`chip${s === active ? " chip-active" : ""}`}
            >
              {s === "CREATED" ? "AWAITING" : s}
            </Link>
          ))}
        </div>
      </header>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Product</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Tag</th>
              <th>Razorpay order</th>
              <th>Placed</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td className="empty-row" colSpan={7}>
                  No orders with this status.
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id}>
                  <td className="mono">{order.user.phone}</td>
                  <td>{names.get(order.product) ?? order.product}</td>
                  <td>{formatAmount(order.amountPaise)}</td>
                  <td>
                    <span className={STATUS_PILL[order.status]}>{order.status}</span>
                  </td>
                  <td className="mono">
                    {order.tag ? (
                      <Link href={`/admin/tags/${order.tag.code}`} className="admin-link">
                        {order.tag.code}
                      </Link>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td className="mono muted">{order.razorpayOrderId}</td>
                  <td className="muted">{order.createdAt.toLocaleDateString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </article>
  );
}
