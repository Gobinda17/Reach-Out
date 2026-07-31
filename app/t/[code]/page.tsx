import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { ShieldIcon } from "@/components/icons";

export default async function TagPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  const tag = await prisma.tag.findUnique({
    where: { code: code.toUpperCase() },
  });

  if (!tag) notFound();

  const initials = tag.name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-gradient-to-b from-indigo-50 to-slate-50 px-6 py-16 dark:from-indigo-950/30 dark:to-slate-950">
      <div className="flex w-full max-w-md flex-col items-center gap-6 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-xl font-semibold text-white shadow-lg shadow-indigo-600/20">
          {initials || <ShieldIcon className="h-7 w-7" />}
        </span>

        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{tag.name}</h1>
          {tag.vehicleReg && (
            <p className="tracking-widest text-slate-500 dark:text-slate-400">{tag.vehicleReg}</p>
          )}
        </div>

        <div className="flex w-full flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-5 text-left text-sm shadow-sm shadow-indigo-900/5 dark:border-slate-800 dark:bg-slate-900">
          <Row label="Phone" value={tag.phone} />
          {tag.email && <Row label="Email" value={tag.email} />}
          {tag.vehicleMakeModel && <Row label="Vehicle" value={tag.vehicleMakeModel} />}
          {tag.address && <Row label="Address" value={tag.address} />}
          {tag.notes && <Row label="Notes" value={tag.notes} />}
        </div>

        <p className="text-xs text-slate-400">
          Tag{" "}
          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono dark:bg-slate-800">
            {tag.code}
          </span>
        </p>

        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          <ShieldIcon className="h-4 w-4" />
          Kavach
        </Link>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 pb-2 last:border-0 last:pb-0 dark:border-slate-800">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className="text-right text-slate-800 dark:text-slate-200">{value}</span>
    </div>
  );
}
