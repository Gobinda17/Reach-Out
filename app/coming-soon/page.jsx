import { Logo } from "@/components/Logo";
import { ShieldIcon, QrIcon, PhoneIcon } from "@/components/icons";

export const metadata = {
  title: "Coming soon — Reach-Out",
  description: "A privacy-first contact tag. Scan it, reach the owner, never see their number.",
  // The site isn't live yet, so keep it out of search results until it is.
  robots: { index: false, follow: false },
};

const POINTS = [
  { icon: QrIcon, text: "One tag on your vehicle, door, or bag" },
  { icon: PhoneIcon, text: "Anyone can reach you — by masked call or message" },
  { icon: ShieldIcon, text: "Your name and number are never shown to them" },
];

// Rendered for every public path while COMING_SOON=true (see proxy.js). It sits
// outside the (marketing) route group deliberately: the site header and footer
// link all over a site that isn't open yet.
export default function ComingSoonPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-yellow-50 via-white to-slate-50 px-6 py-16 dark:from-yellow-500/10 dark:via-slate-950 dark:to-slate-950">
      <div className="flex w-full max-w-lg flex-col items-center gap-8 text-center">
        <Logo size="lg" />

        <div className="flex flex-col items-center gap-3">
          <span className="rounded-full border border-yellow-300 bg-yellow-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-800 dark:border-yellow-500/30 dark:bg-yellow-500/10 dark:text-yellow-300">
            Coming soon
          </span>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
            We&apos;re putting the
            <br />
            finishing touches on it
          </h1>
          <p className="max-w-md text-slate-500 dark:text-slate-400">
            Reach-Out is a privacy-first contact tag. Someone scans it and can call or message
            you — without ever seeing your name, number, or address.
          </p>
        </div>

        <ul className="flex w-full flex-col gap-3 text-left">
          {POINTS.map(({ icon: Icon, text }) => (
            <li
              key={text}
              className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-700 backdrop-blur dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black text-yellow-400">
                <Icon className="h-4 w-4" />
              </span>
              {text}
            </li>
          ))}
        </ul>

        <p className="text-xs text-slate-400">
          Already have a tag? It keeps working — we&apos;ll be open here shortly.
        </p>
      </div>
    </main>
  );
}
