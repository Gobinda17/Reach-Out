import Link from "next/link";
import { Logo } from "./Logo";
import { UserMenu } from "./UserMenu";
import { getCurrentUser } from "@/lib/dal";

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-md dark:border-slate-800/70 dark:bg-slate-950/80">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
        <Link href="/">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 dark:text-slate-300 sm:flex">
          <Link href="/#how-it-works" className="transition-colors hover:text-amber-600 dark:hover:text-yellow-400">
            How it works
          </Link>
          <Link href="/#products" className="transition-colors hover:text-amber-600 dark:hover:text-yellow-400">
            Products
          </Link>
          <Link href="/about" className="transition-colors hover:text-amber-600 dark:hover:text-yellow-400">
            About
          </Link>
          <Link href="/scan" className="transition-colors hover:text-amber-600 dark:hover:text-yellow-400">
            Scan a tag
          </Link>
        </nav>
        <div className="flex items-center gap-4">
          <Link
            href={user ? "/generate" : "/login?next=/generate"}
            className="rounded-full bg-yellow-400 px-4 py-2 text-sm font-semibold text-black shadow-sm shadow-yellow-500/30 transition-transform hover:-translate-y-0.5 hover:bg-yellow-300 hover:shadow-md hover:shadow-yellow-500/40"
          >
            {user ? "Get your tag" : "Log in"}
          </Link>
          {user && <UserMenu user={user} />}
        </div>
      </div>
    </header>
  );
}
