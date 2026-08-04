"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MenuIcon, CloseIcon } from "./icons";
import { isAdminRole } from "@/lib/roles";

const NAV_LINKS = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#products", label: "Products" },
  { href: "/about", label: "About" },
  { href: "/scan", label: "Scan a tag" },
];

export function MobileNav({ user }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const scrollY = window.scrollY;
    const { body } = document;
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.overflow = "hidden";
    return () => {
      body.style.position = "";
      body.style.top = "";
      body.style.left = "";
      body.style.right = "";
      body.style.overflow = "";
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  async function handleLogout() {
    setOpen(false);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="sm:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "Close menu" : "Open menu"}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        {open ? <CloseIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
      </button>

      {open &&
        createPortal(
          <div className="fixed inset-x-0 top-16 bottom-0 z-30 overflow-y-auto border-t border-slate-200/70 bg-white/95 backdrop-blur-md dark:border-slate-800/70 dark:bg-slate-950/95">
            <div className="flex flex-col gap-1 px-6 py-4">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-3 text-base font-medium text-slate-700 transition-colors hover:bg-yellow-50 hover:text-amber-700 dark:text-slate-200 dark:hover:bg-yellow-500/10 dark:hover:text-yellow-400"
                >
                  {link.label}
                </Link>
              ))}

              {user ? (
                <>
                  <div className="my-2 border-t border-slate-200 dark:border-slate-800" />
                  <div className="flex items-center gap-2 px-3 py-2 text-sm text-slate-500 dark:text-slate-400">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black text-[10px] font-semibold text-yellow-400">
                      {(user.name?.trim()?.[0] ?? user.phone.slice(-1)).toUpperCase()}
                    </span>
                    <span className="truncate">{user.name || user.phone}</span>
                  </div>
                  {isAdminRole(user.role) && (
                    <Link
                      href="/admin"
                      onClick={() => setOpen(false)}
                      className="rounded-lg px-3 py-3 text-base font-medium text-slate-700 transition-colors hover:bg-yellow-50 hover:text-amber-700 dark:text-slate-200 dark:hover:bg-yellow-500/10 dark:hover:text-yellow-400"
                    >
                      Admin panel
                    </Link>
                  )}
                  {user.role === "SALES" && (
                    <Link
                      href="/seller"
                      onClick={() => setOpen(false)}
                      className="rounded-lg px-3 py-3 text-base font-medium text-slate-700 transition-colors hover:bg-yellow-50 hover:text-amber-700 dark:text-slate-200 dark:hover:bg-yellow-500/10 dark:hover:text-yellow-400"
                    >
                      Seller dashboard
                    </Link>
                  )}
                  <Link
                    href="/dashboard"
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-3 py-3 text-base font-medium text-slate-700 transition-colors hover:bg-yellow-50 hover:text-amber-700 dark:text-slate-200 dark:hover:bg-yellow-500/10 dark:hover:text-yellow-400"
                  >
                    My account
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="rounded-lg px-3 py-3 text-left text-base font-medium text-rose-600 transition-colors hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
                  >
                    Log out
                  </button>
                </>
              ) : (
                <>
                  <div className="my-2 border-t border-slate-200 dark:border-slate-800" />
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-3 py-3 text-base font-medium text-slate-700 transition-colors hover:bg-yellow-50 hover:text-amber-700 dark:text-slate-200 dark:hover:bg-yellow-500/10 dark:hover:text-yellow-400"
                  >
                    Log in
                  </Link>
                </>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
