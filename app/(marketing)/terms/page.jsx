import Link from "next/link";
import { ShieldIcon } from "@/components/icons";

export const metadata = {
  title: "Terms of Service — Reach-Out",
  description: "The terms that govern ordering, claiming, and using a Reach-Out tag.",
};

const EFFECTIVE_DATE = "August 6, 2026";

const h2 = "mt-12 text-2xl font-semibold text-slate-900 dark:text-white";
const h3 = "mt-8 text-lg font-medium text-slate-900 dark:text-white";
const p = "mt-3 text-slate-600 dark:text-slate-400";
const ul = "mt-3 flex flex-col gap-2 text-slate-600 dark:text-slate-400 list-disc pl-5";

export default function TermsPage() {
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
            Terms of Service
          </span>
          <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl dark:text-white">
            The rules for using Reach-Out.
          </h1>
          <p className="max-w-xl text-slate-500 dark:text-slate-400">
            Effective {EFFECTIVE_DATE}. By creating an account, ordering a tag, claiming one, or
            scanning one, you agree to the terms below.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 pb-24">
        <h2 className={h2}>1. What Reach-Out is</h2>
        <p className={p}>
          Reach-Out (&quot;we&quot;, &quot;us&quot;) provides physical QR/NFC tags and the lookup
          service behind them, so that a person who scans your tag can call or message you without
          ever seeing your name, phone number, or address. &quot;You&quot; means anyone with a
          Reach-Out account, an ordered or claimed tag, or who scans one.
        </p>

        <h2 className={h2}>2. Accounts</h2>
        <ul className={ul}>
          <li>You sign in with a phone number and a one-time code — there is no password to manage</li>
          <li>You&apos;re responsible for keeping access to that phone number secure</li>
          <li>You must provide accurate contact and vehicle details when ordering or claiming a tag</li>
          <li>One account is expected per phone number; we may merge or reject duplicates</li>
        </ul>

        <h2 className={h2}>3. Ordering and claiming tags</h2>
        <p className={p}>
          A tag reaches an owner in one of two ways: you order one directly with your details
          filled in up front, or you claim a blank tag handed out by a retailer/dealer by scanning
          it and adding your details. Either way, once a tag is linked to your details, you&apos;re
          the party responsible for what happens through it.
        </p>

        <h3 className={h3}>Free tags</h3>
        <p className={p}>
          Some tags are issued free of charge, as a digital tag only — no delivery address is
          required and nothing is shipped. Free tags do not offer the &quot;Emergency&quot; contact
          option described in section 6; calls and messages reach the owner&apos;s normal contact
          number.
        </p>

        <h3 className={h3}>Paid tags and shipping</h3>
        <p className={p}>
          Paid tags require a complete delivery address and are shipped to you after payment is
          confirmed. Payments are processed by Razorpay; we never see or store your card, UPI, or
          bank details. Prices are shown, and charged, in Indian Rupees.
        </p>

        <h3 className={h3}>Cancellations and refunds</h3>
        <p className={p}>
          Because a paid order mints a unique tag code as soon as payment is confirmed, orders are
          generally non-refundable once paid. If a tag arrives damaged, defective, or not as
          described, contact us and we&apos;ll make it right.
        </p>

        <h2 className={h2}>4. Masked calling and messaging</h2>
        <p className={p}>
          When someone scans your tag and calls or messages you, we route that contact without
          revealing either side&apos;s real phone number to the other, unless a sender chooses to
          share their own contact details with their message. We may notify you of a new message
          over WhatsApp — see our{" "}
          <Link href="/privacy" className="text-amber-700 underline underline-offset-2 hover:text-amber-800 dark:text-yellow-400 dark:hover:text-yellow-300">
            Privacy Policy
          </Link>{" "}
          for how that works. Calls and messages may be rate-limited to prevent abuse of a tag.
        </p>

        <h2 className={h2}>5. Acceptable use</h2>
        <p className={p}>You agree not to:</p>
        <ul className={ul}>
          <li>Use a tag, or the call/message routing behind it, to harass, threaten, or defraud anyone</li>
          <li>Register or claim a tag with false vehicle, contact, or address details</li>
          <li>Attempt to identify a tag&apos;s owner by any means other than what the tag itself provides</li>
          <li>Attempt to bypass rate limits, scan tokens, or other abuse protections</li>
          <li>Resell, duplicate, or reproduce a tag code or QR you weren&apos;t issued</li>
          <li>Use the service for anything unlawful under applicable law</li>
        </ul>
        <p className={p}>
          We may suspend or deactivate a tag or account that violates these terms, or that we
          reasonably believe is being used to cause harm.
        </p>

        <h2 className={h2}>6. Emergency use</h2>
        <p className={p}>
          The &quot;Emergency&quot; contact option on a tag is a way to flag urgency to the
          owner — it is not a connection to police, fire, ambulance, or any emergency service.
          In a genuine emergency, always contact your local emergency services directly.
        </p>

        <h2 className={h2}>7. Availability</h2>
        <p className={p}>
          We aim to keep tag lookups, calling, and messaging available at all times, but we don&apos;t
          guarantee uninterrupted service — this depends in part on third-party providers (payment
          processing, call routing, and WhatsApp delivery) that are outside our control.
        </p>

        <h2 className={h2}>8. Limitation of liability</h2>
        <p className={p}>
          Reach-Out is provided on an &quot;as is&quot; basis. To the fullest extent permitted by
          law, we aren&apos;t liable for indirect, incidental, or consequential damages arising
          from use of the service, including a missed call or message, a delayed shipment, or
          reliance on the emergency contact option described above.
        </p>

        <h2 className={h2}>9. Changes to these terms</h2>
        <p className={p}>
          If we make a material change, we&apos;ll update the effective date above and, where
          appropriate, let existing tag owners know directly. Continued use of Reach-Out after a
          change means you accept the updated terms.
        </p>

        <h2 className={h2}>10. Governing law</h2>
        <p className={p}>
          These terms are governed by the laws of India, and any dispute is subject to the
          exclusive jurisdiction of the courts of India.
        </p>

        <h2 className={h2}>11. Contact us</h2>
        <p className={p}>
          Questions about these terms? Reach us at{" "}
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
