import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatAmount } from "@/lib/products";
import { productNameMap } from "@/lib/catalogue";

const STATUS_PILL = {
  PAID: "pill pill-soft pill-green",
  CREATED: "pill pill-soft pill-amber",
  FAILED: "pill pill-soft pill-red",
};

async function getStats() {
  const [userCount, usersByRole, tagCount, ordersByStatus, revenue, revenueByProduct] =
    await Promise.all([
      prisma.user.count(),
      prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
      prisma.tag.count(),
      prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.order.aggregate({ where: { status: "PAID" }, _sum: { amountPaise: true } }),
      prisma.order.groupBy({
        by: ["product"],
        where: { status: "PAID" },
        _count: { _all: true },
        _sum: { amountPaise: true },
      }),
    ]);

  const countFor = (rows, key, value) => rows.find((r) => r[key] === value)?._count._all ?? 0;

  return {
    userCount,
    superAdminCount: countFor(usersByRole, "role", "SUPERADMIN"),
    adminCount: countFor(usersByRole, "role", "ADMIN"),
    salesCount: countFor(usersByRole, "role", "SALES"),
    customerCount: countFor(usersByRole, "role", "CUSTOMER"),
    tagCount,
    paidCount: countFor(ordersByStatus, "status", "PAID"),
    pendingCount: countFor(ordersByStatus, "status", "CREATED"),
    failedCount: countFor(ordersByStatus, "status", "FAILED"),
    revenuePaise: revenue._sum.amountPaise ?? 0,
    revenueByProduct: [...revenueByProduct].sort(
      (a, b) => (b._sum.amountPaise ?? 0) - (a._sum.amountPaise ?? 0)
    ),
  };
}

export default async function AdminOverviewPage() {
  const names = await productNameMap();
  const productName = (slug) => names.get(slug) ?? slug;

  const [stats, recentOrders, recentTags] = await Promise.all([
    getStats(),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { user: { select: { phone: true } }, tag: { select: { code: true } } },
    }),
    prisma.tag.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { createdBy: { select: { phone: true } } },
    }),
  ]);

  const kpis = [
    {
      label: "Revenue",
      value: formatAmount(stats.revenuePaise),
      sub: "from verified payments",
      tagText: "Collected",
      tagClass: "kpi-tag positive",
    },
    {
      label: "Paid orders",
      value: stats.paidCount,
      sub: `${stats.pendingCount} awaiting payment`,
      tagText: stats.failedCount > 0 ? `${stats.failedCount} failed` : "Healthy",
      tagClass: stats.failedCount > 0 ? "kpi-tag warning" : "kpi-tag positive",
    },
    {
      label: "Tags issued",
      value: stats.tagCount,
      sub: "live contact tags",
      tagText: "Total",
      tagClass: "kpi-tag neutral",
    },
    {
      label: "Users",
      value: stats.userCount,
      sub: `${stats.superAdminCount + stats.adminCount} admin · ${stats.salesCount} seller`,
      tagText: "Accounts",
      tagClass: "kpi-tag neutral",
    },
  ];

  return (
    <>
      <section className="kpi-grid">
        {kpis.map((kpi) => (
          <article key={kpi.label} className="card kpi-card">
            <div className="kpi-header">
              <span className="kpi-label">{kpi.label}</span>
              <span className={kpi.tagClass}>{kpi.tagText}</span>
            </div>
            <div className="kpi-main">
              <span className="kpi-value">{kpi.value}</span>
              <span className="kpi-sub">{kpi.sub}</span>
            </div>
            <div className="kpi-sparkline" />
          </article>
        ))}
      </section>

      <section className="main-grid">
        <article className="card">
          <header className="card-header">
            <div>
              <h2>Recent orders</h2>
              <p>The latest purchases across all products.</p>
            </div>
            <Link href="/admin/orders" className="chip">
              All orders
            </Link>
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
                  <th>Placed</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.length === 0 ? (
                  <tr>
                    <td className="empty-row" colSpan={6}>
                      No orders yet.
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((order) => (
                    <tr key={order.id}>
                      <td className="mono">{order.user.phone}</td>
                      <td>{productName(order.product)}</td>
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
                      <td className="muted">{order.createdAt.toLocaleDateString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>

        <div className="side-column">
          <article className="card">
            <header className="card-header tight">
              <div>
                <h2>Accounts</h2>
                <p>Who can sign in.</p>
              </div>
            </header>
            <dl className="stat-list">
              {[
                ["Super admins", stats.superAdminCount],
                ["Admins", stats.adminCount],
                ["Sellers", stats.salesCount],
                ["Customers", stats.customerCount],
              ].map(([label, value]) => (
                <div key={label} className="stat-row">
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </article>

          <article className="card">
            <header className="card-header tight">
              <div>
                <h2>Orders</h2>
                <p>By payment state.</p>
              </div>
            </header>
            <dl className="stat-list">
              {[
                ["Paid", stats.paidCount],
                ["Awaiting payment", stats.pendingCount],
                ["Failed", stats.failedCount],
              ].map(([label, value]) => (
                <div key={label} className="stat-row">
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </article>

          <article className="card">
            <header className="card-header tight">
              <div>
                <h2>Revenue by product</h2>
                <p>Verified payments only.</p>
              </div>
            </header>
            {stats.revenueByProduct.length === 0 ? (
              <p className="kpi-sub">No paid orders yet.</p>
            ) : (
              <dl className="stat-list">
                {stats.revenueByProduct.map((row) => (
                  <div key={row.product} className="stat-row">
                    <dt>
                      {productName(row.product)} ×{row._count._all}
                    </dt>
                    <dd>{formatAmount(row._sum.amountPaise ?? 0)}</dd>
                  </div>
                ))}
              </dl>
            )}
          </article>
        </div>

        <article className="card full-width">
          <header className="card-header">
            <div>
              <h2>Recent tags</h2>
              <p>The most recently issued contact tags.</p>
            </div>
            <Link href="/admin/tags" className="chip">
              Manage all tags
            </Link>
          </header>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Product</th>
                  <th>Name on tag</th>
                  <th>Created by</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {recentTags.length === 0 ? (
                  <tr>
                    <td className="empty-row" colSpan={5}>
                      No tags yet.
                    </td>
                  </tr>
                ) : (
                  recentTags.map((tag) => (
                    <tr key={tag.id}>
                      <td className="mono">
                        <Link href={`/admin/tags/${tag.code}`} className="admin-link">
                          {tag.code}
                        </Link>
                      </td>
                      <td>{productName(tag.product)}</td>
                      <td>{tag.name}</td>
                      <td className="mono muted">{tag.createdBy?.phone ?? "—"}</td>
                      <td className="muted">{tag.createdAt.toLocaleDateString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </>
  );
}
