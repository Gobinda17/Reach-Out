import Link from "next/link";
import { ShieldIcon } from "@/components/icons";

export const metadata = {
  title: "Data Deletion Instructions — Reach-Out",
  description: "How to request deletion of your Reach-Out account and tag data.",
};

const h2 = "mt-12 text-2xl font-semibold text-slate-900 dark:text-white";
const p = "mt-3 text-slate-600 dark:text-slate-400";
const ul = "mt-3 flex flex-col gap-2 text-slate-600 dark:text-slate-400 list-disc pl-5";

export default function DataDeletionPage() {
  return (
    <div className="flex flex-col">
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 left-1/2 h-[30rem] w-[54rem] -translate-x-1/2 rounded-full bg-gradient-to-br from-yellow-200 via-amber-100 to-yellow-50 opacity-60 blur-3xl dark:from-yellow-500/10 dark:via-amber-500/5 dark:to-transparent"
        />
        <div className="relative mx-auto flex w-full max-w-3xl flex-col items-center gap-4 px-6 py-20 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-yellow-300 bg-yellow-50 px-3 py-1 text-xs font-medium text-amber-800 dark:border-yellow-500/30 dark:bg-yellow-500/10 dark:text-yellow-300">
            <ShieldIcon className="h-3.5 w-3.5" />
            Data Deletion
          </span>
          <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl dark:text-white">
            How to delete your data.
          </h1>
          <p className="max-w-xl text-slate-500 dark:text-slate-400">
            Reach-Out doesn&apos;t use Facebook Login and never receives any data from your
            Facebook or WhatsApp account itself. The only information tied to WhatsApp is the
            phone number already on your tag, used solely to notify you when someone scans it.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 pb-24">
        <h2 className={h2}>What gets deleted</h2>
        <p className={p}>A deletion request removes:</p>
        <ul className={ul}>
          <li>Your account and phone number</li>
          <li>Any tags registered or claimed under your account, and their contact details</li>
          <li>Messages left on your tags by people who scanned it</li>
          <li>Your scan and call history</li>
        </ul>
        <p className={p}>
          Order and invoice records tied to a completed payment may be kept for as long as
          required by accounting and tax law, with personal details removed where the record can
          still serve its purpose without them.
        </p>

        <h2 className={h2}>How to request it</h2>
        <p className={p}>
          There&apos;s currently no self-service delete button in your dashboard — email{" "}
          <a
            href="mailto:privacy@reachoutqr.com?subject=Data%20deletion%20request"
            className="text-amber-700 underline underline-offset-2 hover:text-amber-800 dark:text-yellow-400 dark:hover:text-yellow-300"
          >
            privacy@reachoutqr.com
          </a>{" "}
          from the address or phone number on your account, with the subject &quot;Data deletion
          request,&quot; and include:
        </p>
        <ul className={ul}>
          <li>The phone number your Reach-Out account uses</li>
          <li>Any tag code(s) you&apos;d like removed (printed on the tag itself)</li>
        </ul>
        <p className={p}>
          We&apos;ll confirm your identity against the account on file and complete the deletion
          within 30 days, then confirm back to you once it&apos;s done. If you claimed a tag from
          physical stock, deleting your account frees the tag code but doesn&apos;t retrieve the
          physical card — please discard it once deletion is confirmed.
        </p>

        <div className="mt-14 border-t border-slate-200 pt-8 dark:border-slate-800">
          <Link
            href="/privacy"
            className="text-sm font-medium text-amber-700 hover:text-amber-800 dark:text-yellow-400 dark:hover:text-yellow-300"
          >
            ← Back to Privacy Policy
          </Link>
        </div>
      </section>
    </div>
  );
}
