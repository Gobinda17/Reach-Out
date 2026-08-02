import Link from "next/link";
import { headers } from "next/headers";
import QRCode from "qrcode";
import {
  ShieldIcon,
  QrIcon,
  ChatIcon,
  BoltIcon,
  CameraIcon,
  LayersIcon,
  TagIcon,
  ReachIcon,
  CarIcon,
} from "@/components/icons";
import { formatInr, isFree, productColor } from "@/lib/products";
import { listProducts } from "@/lib/catalogue";
import { ETAG_PRODUCT_SLUG } from "@/lib/etagShared";
import { FadeIn } from "@/components/FadeIn";
import { Logo } from "@/components/Logo";

const STEPS = [
  {
    number: "01",
    title: "Add your details",
    body: "Enter your name, phone number, and vehicle info once. Nothing is shown publicly.",
  },
  {
    number: "02",
    title: "Get your tag",
    body: "We generate a unique QR code tied to those details — print it, stick it, or keep it digital.",
  },
  {
    number: "03",
    title: "Anyone can reach you",
    body: "Scan the tag with any phone camera to look up the contact card instantly. No app required.",
  },
];

const FEATURE_STRIP = [
  {
    icon: ShieldIcon,
    title: "Private contact",
    body: "Your details are never shown to the person reaching you.",
  },
  {
    icon: ChatIcon,
    title: "Reach by message",
    body: "Scanners see your card straight from the page — no number ever changes hands.",
  },
  {
    icon: BoltIcon,
    title: "Instant lookup",
    body: "Scanning resolves to the contact card in a single request, no waiting.",
  },
];

const PRODUCT_CHECKLIST = [
  "Works with any phone camera — no app to install",
  "Owner details stay private, always",
  "One short code, reusable for reprints",
  "Free to generate, no account needed to scan",
];

// Per-slug presentation only. Names, descriptions and prices come from the
// database so the admin can edit them.
const PRODUCT_STYLES = {
  "vehicle-tag": { color: "bg-black text-yellow-400", icon: "car" },
  "business-card": { color: "bg-yellow-400 text-black" },
  "door-tag": { color: "bg-zinc-800 text-yellow-400" },
  "free-etag": { color: "bg-amber-500 text-black" },
};

const FALLBACK_STYLE = { color: "bg-zinc-800 text-yellow-400" };
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

const PROMISE = [
  { title: "Zero setup", body: "Generate a tag in under a minute." },
  { title: "No app needed", body: "Any camera app can scan it." },
  { title: "Private by design", body: "Your number is never shown." },
];

const MARQUEE_ITEMS = [
  "Scan the tag",
  "Reach out",
  "Stay private",
  "No number shown",
  "Works on any car or bike",
];

export default async function Home() {
  const hdrs = await headers();
  const host = hdrs.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
  const heroQrSvg = await QRCode.toString(`${protocol}://${host}/`, {
    type: "svg",
    margin: 1,
    color: { dark: "#000000ff", light: "#ffffff00" },
  });
  const products = await listProducts();

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 left-1/2 h-[36rem] w-[62rem] -translate-x-1/2 rounded-full bg-gradient-to-br from-yellow-200 via-amber-100 to-yellow-50 opacity-60 blur-3xl animate-[float-blob_9s_ease-in-out_infinite] motion-reduce:animate-none dark:from-yellow-500/10 dark:via-amber-500/5 dark:to-transparent"
        />
        <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-6 py-24 lg:grid-cols-2 lg:gap-36 lg:py-32">
          <div className="flex flex-col items-start gap-6 text-left">
            <span
              className="inline-flex items-center gap-2 rounded-full bg-black px-3 py-1 text-xs font-medium text-yellow-400 opacity-0 animate-[fade-in-up_0.6s_ease-out_0.05s_forwards] motion-reduce:opacity-100 motion-reduce:animate-none"
            >
              <ShieldIcon className="h-3.5 w-3.5" />
              Privacy-first contact tags
            </span>
            <h1
              className="max-w-xl text-4xl font-semibold tracking-tight text-slate-900 opacity-0 animate-[fade-in-up_0.6s_ease-out_0.15s_forwards] motion-reduce:opacity-100 motion-reduce:animate-none sm:text-5xl dark:text-white"
            >
              Let people reach you —{" "}
              <span className="relative whitespace-nowrap">
                <span className="relative z-10">without sharing your number</span>
                <span className="absolute inset-x-0 bottom-1 -z-0 h-3 bg-yellow-300/70 dark:bg-yellow-400/30" aria-hidden />
              </span>
              .
            </h1>
            <p
              className="max-w-md text-lg text-slate-600 opacity-0 animate-[fade-in-up_0.6s_ease-out_0.25s_forwards] motion-reduce:opacity-100 motion-reduce:animate-none dark:text-slate-400"
            >
              Put a Reach-Out tag on your car, bike, or bag. Anyone who scans it can look up your
              contact card instantly — your phone number stays private.
            </p>
            <div className="flex flex-col gap-3 pt-2 opacity-0 animate-[fade-in-up_0.6s_ease-out_0.35s_forwards] motion-reduce:opacity-100 motion-reduce:animate-none">
              <span className="text-xs font-semibold uppercase tracking-widest text-amber-600 dark:text-yellow-400">
                New here? Start below
              </span>
              <div className="flex flex-wrap items-center gap-5">
                <Link
                  href="/generate"
                  className="rounded-full bg-black px-6 py-3 text-sm font-medium text-yellow-400 shadow-md shadow-black/20 transition-transform hover:-translate-y-0.5 hover:bg-zinc-900 hover:shadow-lg"
                >
                  Generate your QR →
                </Link>
                <Link
                  href="/scan"
                  className="text-sm font-medium text-slate-700 underline decoration-slate-300 underline-offset-4 transition-colors hover:text-amber-700 hover:decoration-amber-400 dark:text-slate-300 dark:decoration-slate-600 dark:hover:text-yellow-400"
                >
                  Already have a tag? Scan it
                </Link>
              </div>
            </div>

            {/* Mini step tracker — shows the whole flow without scrolling */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-medium text-slate-500 opacity-0 animate-[fade-in-up_0.6s_ease-out_0.45s_forwards] motion-reduce:opacity-100 motion-reduce:animate-none dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-yellow-400 text-[10px] font-bold text-black">
                  1
                </span>
                Add details
              </span>
              <span aria-hidden className="text-slate-300 dark:text-slate-600">→</span>
              <span className="inline-flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-yellow-400 text-[10px] font-bold text-black">
                  2
                </span>
                Get your QR
              </span>
              <span aria-hidden className="text-slate-300 dark:text-slate-600">→</span>
              <span className="inline-flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-yellow-400 text-[10px] font-bold text-black">
                  3
                </span>
                Anyone can reach you
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-500">
              Free to generate · Works with any camera app · No account needed to scan
            </p>
          </div>

          {/* Decorative tag-sticker mockup */}
          <div className="relative mx-auto w-full max-w-sm opacity-0 animate-[fade-in-up_0.7s_ease-out_0.2s_forwards] motion-reduce:opacity-100 motion-reduce:animate-none">
            <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-br from-yellow-100 to-amber-50 dark:from-yellow-500/10 dark:to-transparent" />
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-black/5 dark:border-slate-800">
              <div className="grid grid-cols-5">
                <div className="col-span-3 flex flex-col justify-center gap-3 p-5">
                  <Logo size="sm" theme="light" />
                  <p className="text-lg font-semibold leading-snug text-slate-900">
                    Scan the code to{" "}
                    <span className="underline decoration-yellow-400 decoration-4 underline-offset-2">
                      reach the owner
                    </span>
                    .
                  </p>
                  <p className="text-xs leading-relaxed text-slate-500">
                    Scan with your phone camera, Google Lens, or any QR app — no install needed.
                  </p>
                </div>
                <div className="col-span-2 flex flex-col items-center justify-center gap-2 bg-yellow-400 p-4">
                  <div
                    className="rounded-lg bg-white p-2 [&_svg]:block [&_svg]:h-20 [&_svg]:w-20"
                    dangerouslySetInnerHTML={{ __html: heroQrSvg }}
                  />
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-widest text-black">
                    <ShieldIcon className="h-3 w-3" />
                    PRIVATE
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-around gap-2 border-t border-slate-100 bg-slate-50 px-3 py-2.5 text-[10px] font-medium text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <CameraIcon className="h-3.5 w-3.5" />
                  Any camera
                </span>
                <span className="inline-flex items-center gap-1">
                  <BoltIcon className="h-3.5 w-3.5" />
                  Free to scan
                </span>
                <span className="inline-flex items-center gap-1">
                  <ShieldIcon className="h-3.5 w-3.5" />
                  No number shown
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Marquee — scrolling banner with the car motif */}
      <div aria-hidden className="relative overflow-hidden border-y border-slate-800 bg-black py-3">
        <div className="flex w-max animate-[marquee_24s_linear_infinite] motion-reduce:animate-none">
          {[0, 1].map((rep) => (
            <div key={rep} className="flex shrink-0 items-center">
              {MARQUEE_ITEMS.map((item, i) => (
                <span key={i} className="flex items-center gap-3 pr-8 text-sm">
                  <span className="font-bold uppercase tracking-widest text-yellow-400">{item}</span>
                  <CarIcon className="h-5 w-auto shrink-0 text-yellow-400/60" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <section id="how-it-works" className="mx-auto w-full max-w-5xl px-6 py-20">
        <FadeIn className="text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Three steps. That&apos;s the whole thing.
          </h2>
          <p className="mt-2 text-slate-500 dark:text-slate-400">
            No app installs on either side.
          </p>
        </FadeIn>
        <div className="mt-14 grid gap-10 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <FadeIn key={step.title} delay={i * 100} className="flex flex-col items-start gap-3">
              <span className="inline-flex h-9 items-center rounded-lg bg-yellow-400 px-3 text-sm font-bold text-black">
                {step.number}
              </span>
              <h3 className="text-lg font-medium text-slate-900 dark:text-white">{step.title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">{step.body}</p>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* Feature strip */}
      <section className="border-y border-slate-200 bg-amber-50/40 dark:border-slate-800 dark:bg-slate-900/40">
        <div className="mx-auto grid w-full max-w-5xl gap-5 px-6 py-14 sm:grid-cols-3">
          {FEATURE_STRIP.map((f, i) => (
            <FadeIn
              key={f.title}
              delay={i * 100}
              className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-6 transition-transform hover:-translate-y-1 dark:border-slate-800 dark:bg-slate-900"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-50 text-amber-700 dark:bg-yellow-500/10 dark:text-yellow-400">
                <f.icon className="h-5 w-5" />
              </span>
              <h3 className="text-sm font-medium text-slate-900 dark:text-white">{f.title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">{f.body}</p>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* Product highlight */}
      <section className="mx-auto w-full max-w-5xl px-6 py-20">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <FadeIn className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-3xl bg-black">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-yellow-400/20 blur-2xl animate-[float-blob_7s_ease-in-out_infinite] motion-reduce:animate-none"
            />
            <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
              <span className="flex h-20 w-20 items-center justify-center rounded-2xl bg-yellow-400 text-black">
                <ReachIcon className="h-10 w-10" />
              </span>
              <p className="font-mono text-xs tracking-[0.3em] text-yellow-400/70">AB12CD</p>
            </div>
          </FadeIn>
          <FadeIn delay={100} className="flex flex-col gap-4">
            <span className="text-xs font-medium uppercase tracking-widest text-amber-600 dark:text-yellow-400">
              Featured tag
            </span>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
              Vehicle Tag
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              A weatherproof QR sticker for your windshield. One scan takes anyone straight to
              your private contact card — no number ever printed on the glass.
            </p>
            <ul className="mt-2 grid gap-3 sm:grid-cols-2">
              {PRODUCT_CHECKLIST.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-yellow-400 text-[10px] font-bold text-black">
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href="/generate"
              className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-full bg-yellow-400 px-6 py-3 text-sm font-medium text-black shadow-sm shadow-yellow-500/30 transition-transform hover:-translate-y-0.5 hover:bg-yellow-300 hover:shadow-md"
            >
              Generate your QR →
            </Link>
          </FadeIn>
        </div>
      </section>

      {/* Products */}
      <section id="products" className="border-y border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto w-full max-w-5xl px-6 py-20">
          <FadeIn className="text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
              One tag, wherever you need it
            </h2>
            <p className="mt-2 text-slate-500 dark:text-slate-400">
              Every product runs on the same private lookup underneath.
            </p>
          </FadeIn>
          <div className="mt-14 grid gap-5 sm:grid-cols-2">
            {products.map((product, i) => {
              const style = PRODUCT_STYLES[product.slug] ?? FALLBACK_STYLE;
              return (
                <FadeIn key={product.slug} delay={i * 75}>
                  <Link
                    // The free eTag has its own guided flow — no login, no
                    // address, PDF on WhatsApp — so it doesn't go to /generate.
                    href={
                      product.slug === ETAG_PRODUCT_SLUG
                        ? "/free-tag"
                        : `/generate?product=${product.slug}`
                    }
                    className="group flex h-full flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-6 text-left transition-all hover:-translate-y-1 hover:border-yellow-300 hover:bg-white hover:shadow-xl hover:shadow-black/5 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-yellow-500/40 dark:hover:bg-slate-900"
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span
                        className={`flex h-11 w-11 items-center justify-center rounded-xl ${style.color}`}
                      >
                        {style.icon === "car" ? (
                          <CarIcon className="h-5.5 w-5.5 transition-transform group-hover:translate-x-0.5" />
                        ) : (
                          <TagIcon className="h-5 w-5" />
                        )}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-sm font-medium ${
                          isFree(product)
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                            : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        }`}
                      >
                        {formatInr(product.pricePaise)}
                      </span>
                    </span>
                    <span className="text-lg font-medium text-slate-900 dark:text-white">
                      {product.name}
                    </span>
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      {product.description}
                    </span>
                    <span className="mt-1 text-sm font-medium text-amber-600 opacity-0 transition-opacity group-hover:opacity-100 dark:text-yellow-400">
                      {isFree(product) ? "Get started →" : "Get your tag →"}
                    </span>
                  </Link>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* Why Reach-Out */}
      <section id="why" className="mx-auto w-full max-w-5xl px-6 py-20">
        <FadeIn className="text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Why Reach-Out
          </h2>
        </FadeIn>
        <div className="mt-14 grid gap-8 sm:grid-cols-2">
          {VALUE_PROPS.map((prop, i) => (
            <FadeIn key={prop.title} delay={i * 75} className="flex items-start gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-yellow-50 text-amber-700 dark:bg-yellow-500/10 dark:text-yellow-400">
                <prop.icon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-base font-medium text-slate-900 dark:text-white">{prop.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{prop.body}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* Promise strip */}
      <section className="bg-black">
        <div className="mx-auto grid w-full max-w-5xl gap-8 px-6 py-14 text-center sm:grid-cols-3">
          {PROMISE.map((p, i) => (
            <FadeIn key={p.title} delay={i * 100}>
              <p className="text-lg font-semibold text-yellow-400">{p.title}</p>
              <p className="mt-1 text-sm text-slate-400">{p.body}</p>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-yellow-400 px-6 py-24 text-center">
        <FadeIn className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4">
          <h2 className="text-3xl font-semibold tracking-tight text-black sm:text-4xl">
            Try it in under a minute.
          </h2>
          <p className="max-w-md text-sm text-black/70">
            Generate a tag with your own details, then scan it back to see the lookup in action.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href="/generate"
              className="rounded-full bg-black px-6 py-3 text-sm font-medium text-yellow-400 shadow-sm transition-transform hover:-translate-y-0.5 hover:bg-zinc-900 hover:shadow-md"
            >
              Generate your QR →
            </Link>
            <Link
              href="/scan"
              className="rounded-full border border-black/30 px-6 py-3 text-sm font-medium text-black transition-colors hover:bg-black/10"
            >
              Scan a tag
            </Link>
          </div>
        </FadeIn>
      </section>
    </div>
  );
}
