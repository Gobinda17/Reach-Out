import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/dal";
import { createScanToken } from "@/lib/scanToken";
import { ShieldIcon } from "@/components/icons";
import { TagContactPanel } from "@/components/TagContactPanel";
import { ScanBeacon } from "@/components/ScanBeacon";
import { HideCodeFromAddressBar } from "@/components/HideCodeFromAddressBar";
import { maskPlate, platePrefix, plateIsVerifiable } from "@/lib/plate";
import { ETAG_PRODUCT_SLUG } from "@/lib/etagShared";

export default async function TagPage({ params }) {
  const { code } = await params;

  // createdById is only used server-side below to detect the owner viewing
  // their own tag — it's never sent to the client. This page is public and
  // must never reveal the owner's name, phone, email, address, or notes.
  const tag = await prisma.tag.findUnique({
    where: { code: code.toUpperCase() },
    select: {
      code: true,
      product: true,
      vehicleReg: true,
      createdById: true,
    },
  });

  if (!tag) notFound();

  const user = await getCurrentUser();
  const isOwner = Boolean(user && tag.createdById === user.id);
  const isUnclaimed = tag.createdById === null;

  // Only the masked form ever crosses to the client. The last four digits are
  // the proof-of-presence challenge (lib/plateGate.js) — printing the full
  // plate here would hand the answer to anyone who merely has the URL.
  const maskedPlate = maskPlate(tag.vehicleReg);
  const needsPlate = plateIsVerifiable(tag.vehicleReg);

  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-gradient-to-b from-yellow-50 to-slate-50 px-6 py-16 dark:from-yellow-500/10 dark:to-slate-950">
      <ScanBeacon code={tag.code} />
      <HideCodeFromAddressBar />
      <div className="flex w-full max-w-md flex-col items-center gap-6 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-black text-yellow-400 shadow-lg shadow-black/20">
          <ShieldIcon className="h-7 w-7" />
        </span>

        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
            {isUnclaimed ? "This tag hasn't been claimed yet" : "This tag is registered"}
          </h1>
          {isUnclaimed ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              If this is your tag, claim it below to start receiving calls and messages.
            </p>
          ) : maskedPlate ? (
            <p className="tracking-widest text-slate-500 dark:text-slate-400">{maskedPlate}</p>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              You can reach the owner below.
            </p>
          )}
        </div>

        {!isUnclaimed && (
          <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
            The owner&apos;s name and phone number are never shown here — call or message them
            below and it goes straight through.
          </p>
        )}

        {isOwner ? (
          <div className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-left text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            <ShieldIcon className="h-5 w-5 shrink-0" />
            <p>
              This is your tag — calls and messages from people who scan it show up on your
              dashboard.
            </p>
          </div>
        ) : isUnclaimed ? (
          <Link
            href={`/t/${tag.code}/claim`}
            className="w-full rounded-full bg-black px-5 py-2.5 text-sm font-medium text-yellow-400 shadow-sm shadow-black/20 transition-transform hover:-translate-y-0.5 hover:bg-zinc-900 hover:shadow-md"
          >
            Claim this tag
          </Link>
        ) : (
          <TagContactPanel
            code={tag.code}
            scanToken={await createScanToken(tag.code)}
            maskedPlate={maskedPlate}
            platePrefix={platePrefix(tag.vehicleReg)}
            needsPlate={needsPlate}
            isFree={tag.product === ETAG_PRODUCT_SLUG}
          />
        )}

        <p className="text-xs text-slate-400">
          Tag{" "}
          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono dark:bg-slate-800">
            {tag.code}
          </span>
        </p>

        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-600 hover:text-amber-700 dark:text-yellow-400 dark:hover:text-yellow-300"
        >
          <ShieldIcon className="h-4 w-4" />
          Reach-Out
        </Link>
      </div>
    </div>
  );
}
