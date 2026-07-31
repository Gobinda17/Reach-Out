import Link from "next/link";
import { ShieldIcon } from "./icons";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-md dark:border-slate-800/70 dark:bg-slate-950/80">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm shadow-indigo-500/30">
            <ShieldIcon className="h-4.5 w-4.5" />
          </span>
          Kavach
        </Link>
        <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 dark:text-slate-300 sm:flex">
          <Link href="/#how-it-works" className="transition-colors hover:text-indigo-600 dark:hover:text-indigo-400">
            How it works
          </Link>
          <Link href="/#products" className="transition-colors hover:text-indigo-600 dark:hover:text-indigo-400">
            Products
          </Link>
          <Link href="/about" className="transition-colors hover:text-indigo-600 dark:hover:text-indigo-400">
            About
          </Link>
          <Link href="/scan" className="transition-colors hover:text-indigo-600 dark:hover:text-indigo-400">
            Scan a tag
          </Link>
        </nav>
        <Link
          href="/generate"
          className="rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-indigo-600/25 transition-transform hover:-translate-y-0.5 hover:shadow-md hover:shadow-indigo-600/30"
        >
          Get your tag
        </Link>
      </div>
    </header>
  );
}
