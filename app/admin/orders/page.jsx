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
  const { status, q } = await searchParams;
  const active = STATUSES.includes(status) ? status : "ALL";
  const query = typeof q === "string" ? q.trim() : "";

  const searchWhere = query
    ? {
        OR: [
          { razorpayOrderId: { contains: query, mode: "insensitive" } },
          { product: { contains: query, mode: "insensitive" } },
          { user: { phone: { contains: query } } },
          { user: { name: { contains: query, mode: "insensitive" } } },
          { tag: { code: { contains: query.toUpperCase() } } },
        ],
      }
    : {};
  const statusWhere = active === "ALL" ? {} : { status: active };
  const where = { ...searchWhere, ...statusWhere };

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

  function statusHref(target) {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (target !== "ALL") params.set("status", target);
    const qs = params.toString();
    return qs ? `/admin/orders?${qs}` : "/admin/orders";
  }

  return (
    <article className="card">
      <header className="card-header">
        <div>
          <h2>Orders</h2>
          <p>
            {query
              ? `${totals._count._all} match${totals._count._all === 1 ? "" : "es"} for “${query}”`
              : `${totals._count._all} order${totals._count._all === 1 ? "" : "s"}`}{" "}
            · {formatAmount(totals._sum.amountPaise ?? 0)} total. Showing up to 100, newest first.
          </p>
        </div>
        <div className="chip-row">
          {STATUSES.map((s) => (
            <Link
              key={s}
              href={statusHref(s)}
              className={`chip${s === active ? " chip-active" : ""}`}
            >
              {s === "CREATED" ? "AWAITING" : s}
            </Link>
          ))}
        </div>
      </header>

      <form className="search-form">
        {active !== "ALL" && <input type="hidden" name="status" value={active} />}
        <input
          name="q"
          defaultValue={query}
          placeholder="Search customer, phone, product, tag code, or Razorpay order id."
          aria-label="Search orders"
        />
        <button type="submit" className="pill-btn small">
          Search
        </button>
        {query && (
          <Link href={active === "ALL" ? "/admin/orders" : `/admin/orders?status=${active}`} className="chip">
            Clear search
          </Link>
        )}
      </form>

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
              <th />
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td className="empty-row" colSpan={8}>
                  {query ? "No orders match that search." : "No orders with this status."}
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
                  <td>
                    {order.status === "PAID" ? (
                      <Link href={`/invoices/${order.id}`} className="admin-link">
                        Invoice
                      </Link>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </article>
  );
}
