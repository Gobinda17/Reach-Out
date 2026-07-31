import Link from "next/link";
import { ShieldIcon, LayersIcon, CameraIcon, BoltIcon } from "@/components/icons";

const PRINCIPLES = [
  {
    icon: ShieldIcon,
    title: "Privacy is the default, not a setting",
    body: "You shouldn't have to dig through a menu to keep your number private. On Kavach, it's simply never collected by the tag or the page in the first place.",
  },
  {
    icon: CameraIcon,
    title: "No new habits required",
    body: "The person scanning your tag already has a camera app. We don't ask them to install anything to reach you, and we don't ask you to learn a new dashboard to set it up.",
  },
  {
    icon: LayersIcon,
    title: "One idea, reused everywhere",
    body: "A car tag, a business card, a door tag — they're all the same short code pointing at the same lookup. Simple mechanics, applied wherever you need them.",
  },
];

export default function AboutPage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 left-1/2 h-[30rem] w-[54rem] -translate-x-1/2 rounded-full bg-gradient-to-br from-indigo-200 via-violet-200 to-sky-200 opacity-60 blur-3xl dark:from-indigo-900/40 dark:via-violet-900/30 dark:to-sky-900/30"
        />
        <div className="relative mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-6 py-24 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-300">
            <ShieldIcon className="h-3.5 w-3.5" />
            About Kavach
          </span>
          <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl dark:text-white">
            Privacy shouldn&apos;t be a luxury feature.
          </h1>
          <p className="max-w-xl text-lg text-slate-600 dark:text-slate-400">
            Kavach started from a simple annoyance: the only way to let a stranger reach you was to
            hand over your phone number and hope for the best. We built a tag that solves the
            problem instead of just tolerating it.
          </p>
        </div>
      </section>

      {/* The problem */}
      <section className="mx-auto w-full max-w-3xl px-6 py-16">
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">The problem</h2>
        <div className="mt-4 flex flex-col gap-4 text-slate-600 dark:text-slate-400">
          <p>
            A parked car blocking a driveway. A bag left behind. A door nobody answers. All of
            these need the same thing: a way for a stranger to reach the owner, right now, without
            either of them having to trust the other with a permanent, reusable piece of contact
            information.
          </p>
          <p>
            Writing a phone number on a sticky note taped to a windshield solves the immediate
            problem and creates a permanent one — that number is now public, forever, to anyone who
            walks past.
          </p>
        </div>
      </section>

      {/* Principles */}
      <section className="border-y border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto w-full max-w-5xl px-6 py-20">
          <h2 className="text-center text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
            What we optimize for
          </h2>
          <div className="mt-14 grid gap-10 sm:grid-cols-3">
            {PRINCIPLES.map((p) => (
              <div key={p.title} className="flex flex-col items-start gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-600/20">
                  <p.icon className="h-6 w-6" />
                </span>
                <h3 className="text-lg font-medium text-slate-900 dark:text-white">{p.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Where we are today */}
      <section className="mx-auto w-full max-w-3xl px-6 py-16">
        <div className="flex items-start gap-4 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-6 dark:border-indigo-900 dark:bg-indigo-950/30">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300">
            <BoltIcon className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-base font-medium text-slate-900 dark:text-white">
              Where things stand today
            </h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Right now, Kavach is the core lookup: generate a tag from your details, get a QR code,
              and scanning it resolves straight back to a contact card. Masked calling, WhatsApp
              routing, and the rest of the roadmap build on top of that same short-code foundation.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-24">
        <div className="relative mx-auto flex w-full max-w-5xl flex-col items-center gap-4 overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 px-6 py-16 text-center shadow-xl shadow-indigo-900/20">
          <div
            aria-hidden
            className="pointer-events-none absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-white/10 blur-2xl"
          />
          <h2 className="text-2xl font-semibold text-white">Give it a try</h2>
          <p className="max-w-md text-sm text-indigo-100">
            Generate a tag with your own details and see the whole loop for yourself.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href="/generate"
              className="rounded-full bg-white px-6 py-3 text-sm font-medium text-indigo-700 shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md"
            >
              Generate your QR →
            </Link>
            <Link
              href="/scan"
              className="rounded-full border border-white/40 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10"
            >
              Scan a tag
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
