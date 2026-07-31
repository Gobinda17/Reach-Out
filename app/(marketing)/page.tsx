import Link from "next/link";
import {
  ShieldIcon,
  QrIcon,
  UserIcon,
  ChatIcon,
  CameraIcon,
  BoltIcon,
  LayersIcon,
  TagIcon,
} from "@/components/icons";

const STEPS = [
  {
    icon: UserIcon,
    title: "Add your details",
    body: "Enter your name, phone number, and vehicle info once. Nothing is shown publicly.",
  },
  {
    icon: QrIcon,
    title: "Get your tag",
    body: "We generate a unique QR code tied to those details — print it, stick it, or keep it digital.",
  },
  {
    icon: ChatIcon,
    title: "Anyone can reach you",
    body: "Scan the tag with any phone camera to look up the contact card instantly. No app required.",
  },
];

const PRODUCTS = [
  {
    name: "Vehicle Tag",
    body: "A weatherproof QR sticker for your car or bike windshield.",
    color: "from-indigo-500 to-indigo-600",
  },
  {
    name: "Business Card",
    body: "Share your contact details with a tap or a scan — no printing needed.",
    color: "from-violet-500 to-violet-600",
  },
  {
    name: "Door Tag",
    body: "Let visitors reach you without ringing the bell or knowing your number.",
    color: "from-sky-500 to-sky-600",
  },
  {
    name: "Free eTag",
    body: "Skip the sticker entirely — generate a digital QR you can share right away.",
    color: "from-emerald-500 to-emerald-600",
  },
];

const VALUE_PROPS = [
  {
    icon: ShieldIcon,
    title: "Privacy by default",
    body: "Your phone number never appears on the tag, the page, or in the QR itself.",
  },
  {
    icon: CameraIcon,
    title: "No app needed",
    body: "Works with whatever camera app is already on the scanner's phone.",
  },
  {
    icon: BoltIcon,
    title: "Instant lookup",
    body: "Scanning resolves to the contact card in a single request — no waiting.",
  },
  {
    icon: LayersIcon,
    title: "Reusable tags",
    body: "One short code, one QR — generate as many as you need for different tags or vehicles.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 left-1/2 h-[36rem] w-[62rem] -translate-x-1/2 rounded-full bg-gradient-to-br from-indigo-200 via-violet-200 to-sky-200 opacity-60 blur-3xl dark:from-indigo-900/40 dark:via-violet-900/30 dark:to-sky-900/30"
        />
        <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-6 py-24 lg:grid-cols-2 lg:py-32">
          <div className="flex flex-col items-start gap-6 text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-300">
              <ShieldIcon className="h-3.5 w-3.5" />
              Privacy-first contact tags
            </span>
            <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl dark:text-white">
              Let people reach you —{" "}
              <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                without sharing your number
              </span>
              .
            </h1>
            <p className="max-w-md text-lg text-slate-600 dark:text-slate-400">
              Put a Kavach tag on your car, bike, or bag. Anyone who scans it can look up your
              contact card instantly — your phone number stays private.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href="/generate"
                className="rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-3 text-sm font-medium text-white shadow-md shadow-indigo-600/25 transition-transform hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-600/30"
              >
                Generate your QR →
              </Link>
              <Link
                href="/scan"
                className="rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-medium text-slate-700 transition-colors hover:border-indigo-300 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-indigo-700"
              >
                Scan a tag
              </Link>
            </div>
          </div>

          {/* Decorative contact-card mockup */}
          <div className="relative mx-auto w-full max-w-sm">
            <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-950/60 dark:to-violet-950/40" />
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-indigo-900/5 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-medium text-white">
                  RS
                </span>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">Rahul Sharma</p>
                  <p className="text-xs tracking-widest text-slate-400">AS01 AB 1234</p>
                </div>
              </div>
              <div className="flex items-center justify-center py-8">
                <div className="grid grid-cols-5 grid-rows-5 gap-1">
                  {Array.from({ length: 25 }).map((_, i) => (
                    <span
                      key={i}
                      className={`h-2.5 w-2.5 rounded-[2px] ${
                        [0, 1, 2, 4, 5, 9, 10, 14, 15, 19, 20, 21, 22, 24, 6, 8, 16, 18].includes(i)
                          ? "bg-slate-900 dark:bg-white"
                          : "bg-transparent"
                      }`}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <span className="flex-1 rounded-xl bg-indigo-50 py-2.5 text-center text-xs font-medium text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                  Call
                </span>
                <span className="flex-1 rounded-xl bg-violet-50 py-2.5 text-center text-xs font-medium text-violet-700 dark:bg-violet-950/60 dark:text-violet-300">
                  Message
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="mx-auto w-full max-w-5xl px-6 py-20">
        <div className="text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
            How it works
          </h2>
          <p className="mt-2 text-slate-500 dark:text-slate-400">
            Three steps, no app installs on either side.
          </p>
        </div>
        <div className="mt-14 grid gap-10 sm:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.title} className="flex flex-col items-start gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-600/20">
                <step.icon className="h-6 w-6" />
              </span>
              <h3 className="text-lg font-medium text-slate-900 dark:text-white">{step.title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Products */}
      <section id="products" className="border-y border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto w-full max-w-5xl px-6 py-20">
          <div className="text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
              One tag, wherever you need it
            </h2>
            <p className="mt-2 text-slate-500 dark:text-slate-400">
              Every product runs on the same private lookup underneath.
            </p>
          </div>
          <div className="mt-14 grid gap-5 sm:grid-cols-2">
            {PRODUCTS.map((product) => (
              <Link
                key={product.name}
                href="/generate"
                className="group flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-6 text-left transition-all hover:-translate-y-1 hover:border-transparent hover:bg-white hover:shadow-xl hover:shadow-indigo-900/5 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-900"
              >
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-white ${product.color}`}
                >
                  <TagIcon className="h-5 w-5" />
                </span>
                <span className="text-lg font-medium text-slate-900 dark:text-white">
                  {product.name}
                </span>
                <span className="text-sm text-slate-500 dark:text-slate-400">{product.body}</span>
                <span className="mt-1 text-sm font-medium text-indigo-600 opacity-0 transition-opacity group-hover:opacity-100 dark:text-indigo-400">
                  Get started →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Why Kavach */}
      <section id="why" className="mx-auto w-full max-w-5xl px-6 py-20">
        <div className="text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Why Kavach
          </h2>
        </div>
        <div className="mt-14 grid gap-8 sm:grid-cols-2">
          {VALUE_PROPS.map((prop) => (
            <div key={prop.title} className="flex items-start gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                <prop.icon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-base font-medium text-slate-900 dark:text-white">{prop.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{prop.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA banner */}
      <section className="px-6 pb-24">
        <div className="relative mx-auto flex w-full max-w-5xl flex-col items-center gap-4 overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 px-6 py-20 text-center shadow-xl shadow-indigo-900/20">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl"
          />
          <h2 className="text-3xl font-semibold text-white">Try it in under a minute</h2>
          <p className="max-w-md text-sm text-indigo-100">
            Generate a tag with your own details, then scan it back to see the lookup in action.
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
