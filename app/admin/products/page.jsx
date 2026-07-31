import Link from "next/link";
import { prisma } from "@/lib/db";
import { listAllProducts } from "@/lib/catalogue";
import { formatInr, formatAmount, isFree } from "@/lib/products";
import { PriceForm } from "@/components/admin/PriceForm";
import { ProductForm } from "@/components/admin/ProductForm";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { deleteProduct } from "../actions";

// Rupees, unpadded, for the editable input: 19900 → "199", 19950 → "199.50".
function toInrInput(pricePaise) {
  return pricePaise % 100 === 0 ? String(pricePaise / 100) : (pricePaise / 100).toFixed(2);
}

export default async function AdminProductsPage() {
  const products = await listAllProducts();

  // Sold counts come from orders, which snapshot their own amount — so a price
  // change never alters historical revenue. These also decide whether a product
  // can be deleted outright or only retired.
  const [sold, tagCounts] = await Promise.all([
    prisma.order.groupBy({
      by: ["product"],
      where: { status: "PAID" },
      _count: { _all: true },
      _sum: { amountPaise: true },
    }),
    prisma.tag.groupBy({ by: ["product"], _count: { _all: true } }),
  ]);
  const soldBySlug = new Map(sold.map((s) => [s.product, s]));
  const tagsBySlug = new Map(tagCounts.map((t) => [t.product, t._count._all]));

  return (
    <>
      <article className="card">
        <header className="card-header">
          <div>
            <h2>Products</h2>
            <p>
              {products.length} product{products.length === 1 ? "" : "s"}. Price changes apply to
              new purchases only — orders already placed keep the amount they were charged.
            </p>
          </div>
        </header>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Status</th>
                <th>Price</th>
                <th>Quick price (₹)</th>
                <th>Sold</th>
                <th>Revenue</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td className="empty-row" colSpan={7}>
                    No products yet — add one below.
                  </td>
                </tr>
              ) : (
                products.map((product) => {
                  const stats = soldBySlug.get(product.slug);
                  const referenced =
                    (stats?._count._all ?? 0) > 0 || (tagsBySlug.get(product.slug) ?? 0) > 0;

                  return (
                    <tr key={product.slug}>
                      <td>
                        <Link href={`/admin/products/${product.slug}`} className="admin-link">
                          {product.name}
                        </Link>
                        <div className="mono muted" style={{ fontSize: "0.72rem" }}>
                          {product.slug}
                        </div>
                      </td>
                      <td>
                        <span
                          className={`pill pill-soft${product.active ? " pill-green" : " pill-amber"}`}
                        >
                          {product.active ? "Available" : "Retired"}
                        </span>
                      </td>
                      <td>
                        <span className={`pill pill-soft${isFree(product) ? " pill-green" : ""}`}>
                          {formatInr(product.pricePaise)}
                        </span>
                      </td>
                      <td>
                        <PriceForm product={product} priceInr={toInrInput(product.pricePaise)} />
                      </td>
                      <td className="muted">{stats?._count._all ?? 0}</td>
                      <td className="muted">{formatAmount(stats?._sum.amountPaise ?? 0)}</td>
                      <td>
                        {referenced ? (
                          <span className="muted" title="Sold products can only be retired.">
                            —
                          </span>
                        ) : (
                          <DeleteButton
                            action={deleteProduct}
                            fields={{ slug: product.slug }}
                            confirmText={`Delete ${product.name}? This cannot be undone.`}
                          />
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <p className="kpi-sub" style={{ marginTop: "0.7rem" }}>
          A price of 0 makes the tag free — it skips payment entirely and is issued straight away.
          Products that have been sold can&apos;t be deleted; retire them instead so past orders
          keep their name.
        </p>
      </article>

      <article className="card">
        <header className="card-header">
          <div>
            <h2>Add a product</h2>
            <p>The slug is permanent once created, because orders record it.</p>
          </div>
        </header>
        <ProductForm />
      </article>
    </>
  );
}
