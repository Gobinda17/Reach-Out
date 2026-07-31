import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getProduct, productUsage } from "@/lib/catalogue";
import { formatAmount } from "@/lib/products";
import { ProductForm } from "@/components/admin/ProductForm";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { deleteProduct } from "../../actions";

export default async function AdminProductDetailPage({ params }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const [usage, revenue] = await Promise.all([
    productUsage(slug),
    prisma.order.aggregate({
      where: { product: slug, status: "PAID" },
      _sum: { amountPaise: true },
      _count: { _all: true },
    }),
  ]);

  const referenced = usage.orders > 0 || usage.tags > 0;

  const facts = [
    ["Slug", product.slug],
    ["Paid orders", revenue._count._all],
    ["Revenue", formatAmount(revenue._sum.amountPaise ?? 0)],
    ["Tags issued", usage.tags],
    ["Created", product.createdAt.toLocaleString()],
  ];

  return (
    <>
      <article className="card">
        <header className="card-header">
          <div>
            <h2>{product.name}</h2>
            <p>
              <Link href="/admin/products" className="admin-link">
                ← All products
              </Link>
            </p>
          </div>
          <div className="chip-row" style={{ alignItems: "center" }}>
            <Link href={`/generate?product=${product.slug}`} className="chip">
              View on site →
            </Link>
            {referenced ? (
              <span className="pill pill-soft" title="Sold products can only be retired.">
                Sold — retire instead of deleting
              </span>
            ) : (
              <DeleteButton
                action={deleteProduct}
                fields={{ slug: product.slug }}
                confirmText={`Delete ${product.name}? This cannot be undone.`}
                label="Delete product"
              />
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
            <h2>Edit product</h2>
            <p>Name, description, price, ordering, and availability.</p>
          </div>
        </header>
        <ProductForm product={product} />
      </article>
    </>
  );
}
