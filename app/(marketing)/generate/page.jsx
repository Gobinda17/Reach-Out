import { verifySession } from "@/lib/dal";
import { GenerateForm } from "@/components/GenerateForm";
import { QrIcon } from "@/components/icons";

export default async function GeneratePage() {
  await verifySession();

  return (
    <div className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 h-96 w-[48rem] -translate-x-1/2 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 opacity-70 blur-3xl dark:from-indigo-950/40 dark:to-violet-950/30"
      />
      <div className="relative mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-16">
        <div className="flex flex-col gap-2">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-300">
            <QrIcon className="h-3.5 w-3.5" />
            Generate a tag
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Create a customer QR
          </h1>
          <p className="max-w-lg text-sm text-slate-500 dark:text-slate-400">
            Fill in the customer&apos;s details below. Generating saves them under a short tag code
            and produces a QR pointing to that code — scanning it (with this app or any QR reader)
            looks the details back up.
          </p>
        </div>

        <GenerateForm />
      </div>
    </div>
  );
}
