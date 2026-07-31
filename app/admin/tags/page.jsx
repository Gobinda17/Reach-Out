import Link from "next/link";
import { prisma } from "@/lib/db";
import { productNameMap } from "@/lib/catalogue";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { deleteTag } from "../actions";

export default async function AdminTagsPage({ searchParams }) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.trim() : "";

  const where = query
    ? {
        OR: [
          { code: { contains: query.toUpperCase() } },
          { name: { contains: query, mode: "insensitive" } },
          { phone: { contains: query } },
          { vehicleReg: { contains: query, mode: "insensitive" } },
        ],
      }
    : {};

  const names = await productNameMap();

  const tags = await prisma.tag.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { createdBy: { select: { phone: true } } },
  });

  return (
    <article className="card">
      <header className="card-header">
        <div>
          <h2>Tags</h2>
          <p>
            {query
              ? `${tags.length} match${tags.length === 1 ? "" : "es"} for “${query}”`
              : `${tags.length} tag${tags.length === 1 ? "" : "s"}`}
            , newest first. Showing up to 100.
          </p>
        </div>
        {query && (
          <Link href="/admin/tags" className="chip">
            Clear search
          </Link>
        )}
      </header>

      <form className="search-form">
        <input
          name="q"
          defaultValue={query}
          placeholder="Search code, name, phone, or vehicle reg."
          aria-label="Search tags"
        />
        <button type="submit" className="pill-btn small">
          Search
        </button>
      </form>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Product</th>
              <th>Name</th>
              <th>Phone</th>
              <th>Created by</th>
              <th>Created</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {tags.length === 0 ? (
              <tr>
                <td className="empty-row" colSpan={7}>
                  {query ? "No tags match that search." : "No tags yet."}
                </td>
              </tr>
            ) : (
              tags.map((tag) => (
                <tr key={tag.id}>
                  <td className="mono">
                    <Link href={`/admin/tags/${tag.code}`} className="admin-link">
                      {tag.code}
                    </Link>
                  </td>
                  <td>{names.get(tag.product) ?? tag.product}</td>
                  <td>{tag.name}</td>
                  <td className="mono muted">{tag.phone}</td>
                  <td className="mono muted">{tag.createdBy?.phone ?? "—"}</td>
                  <td className="muted">{tag.createdAt.toLocaleDateString()}</td>
                  <td>
                    <DeleteButton
                      action={deleteTag}
                      fields={{ code: tag.code }}
                      confirmText={`Delete tag ${tag.code}? Anyone scanning it will get "not found".`}
                    />
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
