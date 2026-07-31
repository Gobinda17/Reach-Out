import Link from "next/link";
import { ShieldIcon } from "./icons";

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-14 sm:grid-cols-3">
        <div className="flex flex-col gap-3">
          <span className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
              <ShieldIcon className="h-4 w-4" />
            </span>
            Kavach
          </span>
          <p className="max-w-xs text-sm text-slate-500 dark:text-slate-400">
            A privacy-first contact tag. Scan it, reach the owner, never see their number.
          </p>
        </div>
        <div className="flex flex-col gap-2.5 text-sm">
          <span className="font-medium text-slate-900 dark:text-white">Product</span>
          <Link href="/generate" className="text-slate-500 transition-colors hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400">
            Generate a QR
          </Link>
          <Link href="/scan" className="text-slate-500 transition-colors hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400">
            Scan a tag
          </Link>
          <Link href="/#products" className="text-slate-500 transition-colors hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400">
            Tag types
          </Link>
        </div>
        <div className="flex flex-col gap-2.5 text-sm">
          <span className="font-medium text-slate-900 dark:text-white">Learn</span>
          <Link href="/#how-it-works" className="text-slate-500 transition-colors hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400">
            How it works
          </Link>
          <Link href="/#why" className="text-slate-500 transition-colors hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400">
            Why Kavach
          </Link>
          <Link href="/about" className="text-slate-500 transition-colors hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400">
            About
          </Link>
        </div>
      </div>
      <div className="mx-auto w-full max-w-6xl border-t border-slate-100 px-6 py-6 text-xs text-slate-400 dark:border-slate-900">
        © {new Date().getFullYear()} Kavach. All rights reserved.
      </div>
    </footer>
  );
}
