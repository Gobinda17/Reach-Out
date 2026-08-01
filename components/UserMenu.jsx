"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export function UserMenu({ user }) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="hidden items-center gap-3 text-sm sm:flex">
      {user.role === "ADMIN" && (
        <Link
          href="/admin/users"
          className="font-medium text-slate-600 transition-colors hover:text-amber-600 dark:text-slate-300 dark:hover:text-yellow-400"
        >
          Admin
        </Link>
      )}
      <Link
        href="/dashboard"
        className="font-medium text-slate-600 transition-colors hover:text-amber-600 dark:text-slate-300 dark:hover:text-yellow-400"
      >
        {user.name || user.phone}
      </Link>
      <button
        onClick={handleLogout}
        className="rounded-full border border-slate-300 px-4 py-1.5 font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        Log out
      </button>
    </div>
  );
}
