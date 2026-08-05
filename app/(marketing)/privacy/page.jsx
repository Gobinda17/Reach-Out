import Link from "next/link";
import { ShieldIcon } from "@/components/icons";

export const metadata = {
  title: "Privacy Policy — Reach-Out",
  description: "How Reach-Out collects, uses, and protects your information.",
};

const EFFECTIVE_DATE = "August 6, 2026";

const h2 = "mt-12 text-2xl font-semibold text-slate-900 dark:text-white";
const h3 = "mt-8 text-lg font-medium text-slate-900 dark:text-white";
const p = "mt-3 text-slate-600 dark:text-slate-400";
const ul = "mt-3 flex flex-col gap-2 text-slate-600 dark:text-slate-400 list-disc pl-5";

export default function PrivacyPolicyPage() {
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
            Privacy Policy
          </span>
          <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl dark:text-white">
            Your privacy is the entire product.
          </h1>
          <p className="max-w-xl text-slate-500 dark:text-slate-400">
            Effective {EFFECTIVE_DATE}. This explains what Reach-Out collects, why, and — just as
            importantly — what it deliberately never shows anyone.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 pb-24">
        <p className={p}>
          Reach-Out (&quot;we&quot;, &quot;us&quot;) operates a contact-tag service: a physical
          QR/NFC tag that lets someone reach a tag&apos;s owner — by masked call or message —
          without ever seeing the owner&apos;s name, phone number, or address. This policy covers
          the website, the tags, and the notifications that connect them.
        </p>

        <h2 className={h2}>Information we collect</h2>

        <h3 className={h3}>To create your account</h3>
        <p className={p}>
          Signing in only ever needs a phone number and a one-time code sent to it — we don&apos;t
          collect or store a password.
        </p>

        <h3 className={h3}>To register a tag</h3>
        <p className={p}>When you order or claim a tag, we collect:</p>
        <ul className={ul}>
          <li>Your name, phone number, and (optionally) email</li>
          <li>Vehicle registration and make/model, where relevant to the tag</li>
          <li>A delivery address, for tags that need to be physically shipped to you</li>
          <li>Any notes you add for your own reference</li>
        </ul>

        <h3 className={h3}>When someone scans your tag</h3>
        <p className={p}>
          A person scanning your tag can leave you a message or request a masked call without
          creating an account or identifying themselves. If they choose to, they may voluntarily
          share their own name and phone number with their message — we never require it, and we
          never show your details to them in return.
        </p>

        <h3 className={h3}>Payments</h3>
        <p className={p}>
          Paid tags are processed through Razorpay. We store the order amount and Razorpay&apos;s
          own transaction identifiers — your card, UPI, or bank details are handled entirely by
          Razorpay and never touch our servers.
        </p>

        <h2 className={h2}>How we use your information</h2>
        <ul className={ul}>
          <li>Operating the masked-calling and messaging that let a scanner reach you</li>
          <li>Notifying you over WhatsApp when someone leaves a message on your tag (see below)</li>
          <li>Printing, shipping, and fulfilling physical tags you&apos;ve ordered or claimed</li>
          <li>Processing payments and generating invoices</li>
          <li>Signing you in via one-time codes, and keeping your session secure</li>
          <li>Preventing abuse — for example, rate-limiting repeated calls or messages to a tag</li>
        </ul>

        <h2 className={h2}>WhatsApp notifications</h2>
        <p className={p}>
          If someone leaves a message on your tag, we notify you over WhatsApp using Meta&apos;s
          WhatsApp Business Platform. That notification is sent to the phone number on your tag
          and includes the tag code and the message left for you — nothing about the sender is
          included unless they chose to share it. Meta processes the phone number and message
          content solely to deliver that notification; it is not used by Meta for advertising.
          Meta&apos;s own handling of this data is described in the{" "}
          <a
            href="https://www.whatsapp.com/legal/business-data-processing-terms"
            target="_blank"
            rel="noreferrer"
            className="text-amber-700 underline underline-offset-2 hover:text-amber-800 dark:text-yellow-400 dark:hover:text-yellow-300"
          >
            WhatsApp Business Data Processing Terms
          </a>
          .
        </p>

        <h2 className={h2}>What we never do</h2>
        <ul className={ul}>
          <li>
            We never show a scanner your name, phone number, email, address, or notes — the public
            tag page only ever displays non-identifying vehicle info
          </li>
          <li>We never print your name on the physical tag card — only the tag code and QR</li>
          <li>We never sell your personal information to anyone</li>
          <li>
            We never send a scanner&apos;s real number to you directly for a masked call — a
            temporary routing number stands in for both sides
          </li>
        </ul>

        <h2 className={h2}>Other service providers</h2>
        <p className={p}>Besides Meta&apos;s WhatsApp Business Platform, we rely on:</p>
        <ul className={ul}>
          <li>
            <span className="font-medium text-slate-700 dark:text-slate-300">Razorpay</span> —
            payment processing for paid tag orders
          </li>
          <li>
            <span className="font-medium text-slate-700 dark:text-slate-300">edesy</span> — masked
            voice call routing, so a call can be bridged without either party seeing the
            other&apos;s real number
          </li>
        </ul>
        <p className={p}>
          Each only receives the information it needs to perform that specific function, and none
          are permitted to use it for their own marketing purposes.
        </p>

        <h2 className={h2}>Data retention</h2>
        <p className={p}>
          We keep tag, order, and message records for as long as your account or tag is active, and
          as needed to meet our accounting and legal obligations. You can ask us to delete your
          account and associated tag data at any time — see &quot;Contact us&quot; below.
        </p>

        <h2 className={h2}>Security</h2>
        <p className={p}>
          Sessions are secured with a signed, httpOnly cookie rather than anything readable by
          page scripts. One-time login codes are hashed, rate-limited, and single-use. We don&apos;t
          use passwords, so there&apos;s no password database to compromise in the first place.
        </p>

        <h2 className={h2}>Cookies</h2>
        <p className={p}>
          We use one essential cookie to keep you signed in. We don&apos;t run third-party
          advertising trackers or analytics scripts on Reach-Out.
        </p>

        <h2 className={h2}>Your choices</h2>
        <ul className={ul}>
          <li>Update your tag&apos;s details any time from your dashboard</li>
          <li>
            Ask us to export or delete your personal data — see our{" "}
            <Link href="/data-deletion" className="text-amber-700 underline underline-offset-2 hover:text-amber-800 dark:text-yellow-400 dark:hover:text-yellow-300">
              Data Deletion Instructions
            </Link>
          </li>
          <li>Stop a physical tag from working at all by asking us to deactivate it</li>
        </ul>

        <h2 className={h2}>Children&apos;s privacy</h2>
        <p className={p}>
          Reach-Out is not directed at children, and we don&apos;t knowingly collect information
          from anyone under 18.
        </p>

        <h2 className={h2}>Changes to this policy</h2>
        <p className={p}>
          If we make a material change to how we handle your information, we&apos;ll update the
          effective date above and, where appropriate, let existing tag owners know directly.
        </p>

        <h2 className={h2}>Contact us</h2>
        <p className={p}>
          Questions, or a request to access, correct, or delete your data? Reach us at{" "}
          <a
            href="mailto:privacy@reachoutqr.com"
            className="text-amber-700 underline underline-offset-2 hover:text-amber-800 dark:text-yellow-400 dark:hover:text-yellow-300"
          >
            privacy@reachoutqr.com
          </a>
          .
        </p>

        <div className="mt-14 border-t border-slate-200 pt-8 dark:border-slate-800">
          <Link
            href="/"
            className="text-sm font-medium text-amber-700 hover:text-amber-800 dark:text-yellow-400 dark:hover:text-yellow-300"
          >
            ← Back to home
          </Link>
        </div>
      </section>
    </div>
  );
}
