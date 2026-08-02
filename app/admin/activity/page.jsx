import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSuperAdmin } from "@/lib/dal";
import { ROLE_LABEL } from "@/lib/roles";
import { ACTIVITY_GROUPS, ACTIVITY_LABEL, groupWhere } from "@/lib/activityLog";

const PAGE_SIZE = 50;

const ROLE_PILL = {
  SUPERADMIN: "pill pill-soft pill-red",
  ADMIN: "pill pill-soft pill-amber",
  SALES: "pill pill-soft pill-green",
  CUSTOMER: "pill pill-soft",
};

// Renders the small structured extras without ever dumping raw JSON at the
// reader — long code lists are summarised rather than printed in full.
function metaLine(entry) {
  const meta = entry.metadata;
  if (!meta || typeof meta !== "object") return null;

  const parts = [];
  if (Array.isArray(meta.changed) && meta.changed.length) {
    parts.push(`fields: ${meta.changed.join(", ")}`);
  }
  if (meta.from !== undefined && meta.to !== undefined) parts.push(`${meta.from} → ${meta.to}`);
  if (Array.isArray(meta.rotated) && meta.rotated.length) {
    parts.push(`rotated: ${meta.rotated.join(", ")}`);
  }
  if (Array.isArray(meta.codes) && meta.codes.length) {
    const shown = meta.codes.slice(0, 6).join(", ");
    parts.push(meta.codes.length > 6 ? `${shown} +${meta.codes.length - 6} more` : shown);
  }
  return parts.length ? parts.join(" · ") : null;
}

// Super-admin only. /admin is reachable by any admin, so this page has to make
// the check itself — the layout deliberately guards the whole area at the lower
// ADMIN bar, and the nav simply hides this link from everyone else.
export default async function AdminActivityPage({ searchParams }) {
  const superAdmin = await getSuperAdmin();
  if (!superAdmin) redirect("/admin");

  const { q, page: pageParam, group: groupParam } = await searchParams;
  const query = typeof q === "string" ? q.trim() : "";
  const activeGroup = ACTIVITY_GROUPS.find((g) => g.key === groupParam) ?? ACTIVITY_GROUPS[0];

  const searchWhere = query
    ? {
        OR: [
          { actorPhone: { contains: query } },
          { summary: { contains: query, mode: "insensitive" } },
          { targetLabel: { contains: query, mode: "insensitive" } },
        ],
      }
    : {};

  const where = { ...searchWhere, ...groupWhere(activeGroup) };

  const [counts, total] = await Promise.all([
    Promise.all(
      ACTIVITY_GROUPS.map((group) =>
        prisma.activityLog.count({ where: { ...searchWhere, ...groupWhere(group) } })
      )
    ),
    prisma.activityLog.count({ where }),
  ]);
  const groupCounts = Object.fromEntries(ACTIVITY_GROUPS.map((g, i) => [g.key, counts[i]]));

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const requestedPage = Number(pageParam);
  const page = Number.isInteger(requestedPage)
    ? Math.min(Math.max(requestedPage, 1), totalPages)
    : 1;

  const entries = await prisma.activityLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    include: { actor: { select: { id: true, name: true } } },
  });

  function href(target, targetGroup = activeGroup.key) {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (targetGroup !== "all") params.set("group", targetGroup);
    if (target > 1) params.set("page", String(target));
    const qs = params.toString();
    return qs ? `/admin/activity?${qs}` : "/admin/activity";
  }

  return (
    <article className="card">
      <header className="card-header">
        <div>
          <h2>Activity log</h2>
          <p>
            {query
              ? `${total} match${total === 1 ? "" : "es"} for “${query}”`
              : `${total} entr${total === 1 ? "y" : "ies"}`}
            , newest first. Page {page} of {totalPages}. Every staff action is recorded here and
            never edited or removed. Visible to super admins only.
          </p>
        </div>
        {query && (
          <Link href="/admin/activity" className="chip">
            Clear search
          </Link>
        )}
      </header>

      <div className="chip-row" style={{ marginBottom: "0.75rem" }}>
        {ACTIVITY_GROUPS.map((group) => (
          <Link
            key={group.key}
            href={href(1, group.key)}
            className={`chip${activeGroup.key === group.key ? " chip-active" : ""}`}
          >
            {group.label} ({groupCounts[group.key]})
          </Link>
        ))}
      </div>

      <form className="search-form">
        {activeGroup.key !== "all" && (
          <input type="hidden" name="group" value={activeGroup.key} />
        )}
        <input
          name="q"
          defaultValue={query}
          placeholder="Search by who, what, or which record."
          aria-label="Search activity"
        />
        <button type="submit" className="pill-btn small">
          Search
        </button>
      </form>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>When</th>
              <th>Who</th>
              <th>Action</th>
              <th>What happened</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td className="empty-row" colSpan={4}>
                  {query ? "Nothing matches that search." : "No activity recorded yet."}
                </td>
              </tr>
            ) : (
              entries.map((entry) => {
                const extra = metaLine(entry);
                return (
                  <tr key={entry.id}>
                    <td className="muted" style={{ whiteSpace: "nowrap" }}>
                      {entry.createdAt.toLocaleString()}
                    </td>
                    <td className="mono">
                      {/* The phone is a snapshot taken at the time, so it still
                          reads correctly if the account was later deleted. */}
                      {entry.actor ? (
                        <Link href={`/admin/users/${entry.actor.id}`} className="admin-link">
                          {entry.actorPhone}
                        </Link>
                      ) : (
                        <span title="This account has since been deleted">{entry.actorPhone}</span>
                      )}
                      {entry.actorRole && (
                        <div>
                          <span className={ROLE_PILL[entry.actorRole]}>
                            {ROLE_LABEL[entry.actorRole] ?? entry.actorRole}
                          </span>
                        </div>
                      )}
                    </td>
                    <td>{ACTIVITY_LABEL[entry.action] ?? entry.action}</td>
                    <td>
                      {entry.summary}
                      {extra && <div className="muted">{extra}</div>}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="chip-row" style={{ marginTop: "0.75rem", alignItems: "center" }}>
          {page > 1 ? (
            <Link href={href(page - 1)} className="pill-btn small">
              ← Newer
            </Link>
          ) : (
            <span className="pill-btn small" aria-disabled="true" style={{ opacity: 0.4 }}>
              ← Newer
            </span>
          )}
          <span className="kpi-sub">
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Link href={href(page + 1)} className="pill-btn small">
              Older →
            </Link>
          ) : (
            <span className="pill-btn small" aria-disabled="true" style={{ opacity: 0.4 }}>
              Older →
            </span>
          )}
        </div>
      )}
    </article>
  );
}
