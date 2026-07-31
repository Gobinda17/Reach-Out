"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV = [
  {
    label: "Overview",
    items: [{ href: "/admin", icon: "📊", text: "Dashboard", title: "Dashboard" }],
  },
  {
    label: "Manage",
    items: [
      { href: "/admin/orders", icon: "💳", text: "Orders", title: "Orders" },
      { href: "/admin/products", icon: "💰", text: "Products", title: "Products" },
      { href: "/admin/tags", icon: "🏷️", text: "Tags", title: "Tags" },
      { href: "/admin/users", icon: "👥", text: "Users", title: "Users" },
    ],
  },
];

const THEME_KEY = "reachOutAdminTheme";

// Applies the saved theme before first paint, so a light-theme user never sees a
// flash of the dark shell. Doing this in an effect would repaint after hydration.
const THEME_BOOTSTRAP = `(function(){try{var t=localStorage.getItem(${JSON.stringify(THEME_KEY)});if(t==="light"||t==="dark"){document.getElementById("adminApp").dataset.theme=t}}catch(e){}})()`;

function isActive(pathname, href) {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

function initials(user) {
  const source = user.name?.trim();
  if (source) {
    const parts = source.split(/\s+/);
    return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
  }
  return user.phone.slice(-2);
}

export function AdminShell({ user, children }) {
  const pathname = usePathname();
  const router = useRouter();

  const [collapsed, setCollapsed] = useState(false);
  const [compact, setCompact] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef(null);

  // The theme lives on the DOM node rather than in React state: the bootstrap
  // script above may already have changed it, and re-deriving it into state
  // would mean writing state from an effect. Which glyph shows is decided by CSS.
  function toggleTheme() {
    const root = rootRef.current;
    if (!root) return;
    const next = root.dataset.theme === "light" ? "dark" : "light";
    root.dataset.theme = next;
    try {
      localStorage.setItem(THEME_KEY, next);
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

  // Tag search is the only global search that means anything here, so the topbar
  // field routes into the tags view rather than pretending to search everything.
  function handleSearch(e) {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/admin/tags?q=${encodeURIComponent(q)}` : "/admin/tags");
  }

  const current = NAV.flatMap((s) => s.items).find((i) => isActive(pathname, i.href));

  return (
    <div
      id="adminApp"
      ref={rootRef}
      className="admin-app"
      data-theme="dark"
      data-compact={compact ? "true" : "false"}
    >
      <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      <aside className={`sidebar${collapsed ? " collapsed" : ""}`}>
        <div className="sidebar-header">
          <button
            type="button"
            className="logo-btn"
            onClick={() => setCollapsed((v) => !v)}
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <span className="logo-mark" />
            <span className="logo-text">Reach-Out</span>
          </button>
        </div>

        <nav className="sidebar-nav">
          {NAV.map((section) => (
            <div key={section.label} className="nav-section">
              <span className="nav-label">{section.label}</span>
              {section.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.text}
                  className={`nav-item${isActive(pathname, item.href) ? " active" : ""}`}
                  aria-current={isActive(pathname, item.href) ? "page" : undefined}
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
            <span className="status-text">Signed in as admin</span>
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
              <span className="crumb-main">{current?.title ?? "Admin"}</span>
              <span className="crumb-sub">Reach-Out admin</span>
            </div>
          </div>
          <div className="topbar-center">
            <form className="search" onSubmit={handleSearch}>
              <span className="search-icon">⌕</span>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search tags by code, name, phone…"
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
