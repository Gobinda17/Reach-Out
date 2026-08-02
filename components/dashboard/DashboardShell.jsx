"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReachIcon } from "@/components/icons";
import { DASHBOARD_THEME_KEY } from "@/lib/dashboardTheme";

function isActive(pathname, href, rootHref) {
  return href === rootHref ? pathname === rootHref : pathname.startsWith(href);
}

function initials(user) {
  const source = user.name?.trim();
  if (source) {
    const parts = source.split(/\s+/);
    return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
  }
  return user.phone.slice(-2);
}

// The staff dashboard chrome — sidebar, topbar, theme toggle — shared by the
// admin and seller areas. Everything role-specific arrives as props, so the two
// dashboards can't drift apart visually:
//
//   nav          sections of links, [{ label, items: [{ href, icon, text, title }] }]
//   rootHref     the section root, so its nav item highlights on exact match only
//   searchHref   where the topbar search submits, as `${searchHref}?q=…`
//   statusText   the "signed in as" line in the sidebar footer
//   areaLabel    the sub-line under the topbar breadcrumb
export function DashboardShell({
  user,
  nav,
  rootHref,
  searchHref,
  searchPlaceholder,
  statusText,
  areaLabel,
  children,
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [collapsed, setCollapsed] = useState(false);
  const [compact, setCompact] = useState(false);
  const [query, setQuery] = useState("");

  // A lazy initializer, not an effect: it reads localStorage during the very
  // first client render, so arriving here by client-side navigation (where the
  // inline bootstrap script never executes) still paints the right theme with
  // no flash. On a fresh load the server renders "dark", the bootstrap script
  // has already corrected the DOM, and this initializer computes the same value
  // the script used — so React and the DOM agree.
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "dark";
    try {
      const stored = localStorage.getItem(DASHBOARD_THEME_KEY);
      return stored === "light" || stored === "dark" ? stored : "dark";
    } catch {
      return "dark";
    }
  });

  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    try {
      localStorage.setItem(DASHBOARD_THEME_KEY, next);
    } catch {
      // localStorage can be unavailable (private mode); the toggle still works
      // for this session.
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  // Tag search is the only search that means anything in either dashboard, so
  // the topbar field routes into that area's tags view rather than pretending
  // to search everything.
  function handleSearch(e) {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `${searchHref}?q=${encodeURIComponent(q)}` : searchHref);
  }

  const current = nav.flatMap((s) => s.items).find((i) => isActive(pathname, i.href, rootHref));

  return (
    <div
      className="admin-app"
      // The bootstrap script may have already set this attribute before React
      // hydrates; tell React to keep the DOM's value rather than "correcting" it.
      suppressHydrationWarning
      data-theme={theme}
      data-compact={compact ? "true" : "false"}
    >
      <aside className={`sidebar${collapsed ? " collapsed" : ""}`}>
        <div className="sidebar-header">
          <button
            type="button"
            className="logo-btn"
            onClick={() => setCollapsed((v) => !v)}
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <span className="logo-mark">
              <ReachIcon className="h-3.5 w-3.5" />
            </span>
            <span className="logo-text">
              Reach<span className="logo-text-accent">-Out</span>
            </span>
          </button>
        </div>

        <nav className="sidebar-nav">
          {nav.map((section) => (
            <div key={section.label} className="nav-section">
              <span className="nav-label">{section.label}</span>
              {section.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.text}
                  className={`nav-item${isActive(pathname, item.href, rootHref) ? " active" : ""}`}
                  aria-current={isActive(pathname, item.href, rootHref) ? "page" : undefined}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-text">{item.text}</span>
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="status-pill">
            <span className="status-dot" />
            <span className="status-text">{statusText}</span>
          </div>
          <button
            type="button"
            className="pill-btn pill-btn-ghost small footer-wide"
            onClick={() => setCompact((v) => !v)}
          >
            {compact ? "Comfortable mode" : "Compact mode"}
          </button>
          <Link href="/" className="pill-btn pill-btn-ghost small footer-wide">
            ← Back to site
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="pill-btn pill-btn-ghost pill-btn-danger small footer-wide"
          >
            Log out
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="topbar-left">
            <div className="breadcrumb">
              <span className="crumb-main">{current?.title ?? nav[0]?.items[0]?.title}</span>
              <span className="crumb-sub">{areaLabel}</span>
            </div>
          </div>
          <div className="topbar-center">
            <form className="search" onSubmit={handleSearch}>
              <span className="search-icon">⌕</span>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                aria-label="Search tags"
              />
            </form>
          </div>
          <div className="topbar-right">
            <button
              type="button"
              className="pill-btn pill-btn-ghost"
              onClick={toggleTheme}
              aria-label="Toggle light and dark theme"
            >
              <span className="theme-when-dark">🌙</span>
              <span className="theme-when-light">☀️</span>
            </button>
            <div className="avatar-pill">
              <div className="avatar-circle">{initials(user)}</div>
              <div className="avatar-meta">
                <span className="avatar-name">{user.name || user.phone}</span>
                <span className="avatar-role">{user.role}</span>
              </div>
            </div>
          </div>
        </header>

        <main className="content">{children}</main>
      </div>
    </div>
  );
}
