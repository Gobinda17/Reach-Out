import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { verifySession, getCurrentUser } from "@/lib/dal";
import { ShieldIcon } from "@/components/icons";
import { ClaimTagForm } from "@/components/ClaimTagForm";

export default async function ClaimTagPage({ params }) {
  const { code } = await params;
  const upperCode = code.toUpperCase();

  // The proxy already requires a session for /t/:code/claim — this re-check is
  // the same defense-in-depth pattern used on every other protected page here,
  // since the proxy is only a first pass.
  const session = await verifySession();
  const user = await getCurrentUser();

  const tag = await prisma.tag.findUnique({
    where: { code: upperCode },
    select: { code: true, createdById: true },
  });
  if (!tag) notFound();

  const isOwner = tag.createdById === session.userId;

  return (
    <div className="flex min-h-full flex-col items-center gap-8 bg-gradient-to-b from-yellow-50 to-slate-50 px-6 py-16 dark:from-yellow-500/10 dark:to-slate-950">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-600 hover:text-amber-700 dark:text-yellow-400 dark:hover:text-yellow-300"
      >
        <ShieldIcon className="h-4 w-4" />
        Reach-Out
      </Link>

      <div className="flex w-full max-w-md flex-col items-center gap-4 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-black text-yellow-400 shadow-lg shadow-black/20">
          <ShieldIcon className="h-6 w-6" />
        </span>

        {tag.createdById && !isOwner ? (
          <>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
              This tag has already been claimed
            </h1>
            <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
              Someone already registered tag{" "}
              <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono dark:bg-slate-800">
                {tag.code}
              </span>
              . If you think that&apos;s wrong, contact support.
            </p>
            <Link
              href={`/t/${tag.code}`}
              className="text-sm font-medium text-amber-600 hover:text-amber-700 dark:text-yellow-400 dark:hover:text-yellow-300"
            >
              View the tag →
            </Link>
          </>
        ) : isOwner ? (
          <>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
              This tag is already yours
            </h1>
            <Link
              href="/dashboard"
              className="text-sm font-medium text-amber-600 hover:text-amber-700 dark:text-yellow-400 dark:hover:text-yellow-300"
            >
              Go to your dashboard →
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
              Claim tag {tag.code}
            </h1>
            <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
              Fill in your details below and this tag will belong to you — calls and messages
              from anyone who scans it will reach you privately.
            </p>
          </>
        )}
      </div>

      {!tag.createdById && (
        <div className="w-full max-w-md">
          <ClaimTagForm
            code={tag.code}
            initialCustomer={{ name: user?.name ?? "", phone: session.phone ?? "" }}
          />
        </div>
      )}
    </div>
  );
}
