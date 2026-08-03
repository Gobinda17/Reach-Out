"use client";

import { useState } from "react";
import Link from "next/link";
import Script from "next/script";
import QRCode from "qrcode";
import { composeTagCard, TAG_CARD_ASPECT } from "@/lib/tagCard";
import { Stepper } from "@/components/wizard/Stepper";
import { AddressFields } from "@/components/AddressFields";
import { validateAddress } from "@/lib/customer";
import { PhoneField } from "@/components/PhoneField";
import { VEHICLE_TYPES, defaultVehicleType } from "@/lib/etagShared";
import { formatInr, isVehicleProduct } from "@/lib/products";

const CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

const fieldShell =
  "rounded-xl border border-slate-300 bg-white text-slate-900 outline-none transition-colors focus-within:border-yellow-400 focus-within:ring-2 focus-within:ring-yellow-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus-within:border-yellow-500 dark:focus-within:ring-yellow-500/20";
const field = `${fieldShell} w-full px-4 py-3 text-base`;

// A vehicle step only makes sense for a tag that goes on a vehicle — see
// VEHICLE_PRODUCT_SLUGS. Anything else skips it and is four steps instead of five.
function stepsFor(product) {
  const vehicle = isVehicleProduct(product.slug);
  return ["Start", "You", ...(vehicle ? ["Vehicle"] : []), "Address", "Pay"];
}

// The paid counterpart of FreeEtagWizard: same stepper, same one-thing-per-screen
// shape. Two things differ, because the product does — a physical tag has to be
// posted, so there's an Address step, and it ends at Razorpay rather than an OTP.
export function PaidTagWizard({ initialCustomer, product: initialProduct, products, devBypass }) {
  const [product, setProduct] = useState(initialProduct);
  const [step, setStep] = useState(0);

  const [name, setName] = useState(initialCustomer?.name ?? "");
  const [email, setEmail] = useState(initialCustomer?.email ?? "");
  const [phone, setPhone] = useState(initialCustomer?.phone ?? "");
  const [vehicleReg, setVehicleReg] = useState(initialCustomer?.vehicleReg ?? "");
  // Starts on whatever the chosen product implies — a Bike Tag shouldn't open
  // on "Car" — and follows the product if it's swapped on the Start step.
  const [vehicleType, setVehicleType] = useState(() => defaultVehicleType(initialProduct.slug));
  const [address, setAddress] = useState(initialCustomer?.address ?? "");

  const [checkoutReady, setCheckoutReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const steps = stepsFor(product);
  const label = steps[step];
  const hasVehicleStep = steps.includes("Vehicle");
  const paying = steps[step] === "Pay";

  const customer = {
    name: name.trim(),
    phone,
    email: email.trim(),
    vehicleReg: vehicleReg.trim(),
    // Same convention as the free flow: the wizard collects a type rather than
    // free-text make/model, and this is the field that describes the vehicle.
    vehicleMakeModel: hasVehicleStep ? vehicleType : "",
    address,
    notes: "",
  };

  // Paid tags are posted, so the delivery address has to be complete — the same
  // check the API runs on the composed string before taking any money.
  const addressError = validateAddress(address);

  function canAdvance() {
    if (label === "You") return Boolean(name.trim() && phone);
    if (label === "Vehicle") return Boolean(vehicleReg.trim());
    if (label === "Address") return !addressError;
    return true;
  }

  async function post(url, body) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error ?? "Could not issue this tag.");
    return data;
  }

  async function showTag(code) {
    const url = `${window.location.origin}/t/${code}`;
    const qrDataUrl = await QRCode.toDataURL(url, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 320,
    });
    setResult({ code, url, cardDataUrl: await composeTagCard({ qrDataUrl, code }) });
  }

  // Unchanged from the previous single-page form: the tag is only ever created
  // after Razorpay's signature verifies server-side, or immediately when
  // RAZORPAY_DEV_MODE is on and there is no widget to open.
  async function handlePay() {
    // The Address step gates Continue on this, but the step list changes with
    // the product — never open a payment for a tag that can't be delivered.
    if (addressError) {
      setStep(steps.indexOf("Address"));
      setError(addressError);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const order = await post("/api/orders", { product: product.slug, customer });
      if (order.devBypass) {
        await showTag(order.code);
        setSubmitting(false);
        return;
      }
      startPayment(order);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  function startPayment(order) {
    const rzp = new window.Razorpay({
      key: order.keyId,
      order_id: order.orderId,
      amount: order.amountPaise,
      currency: order.currency,
      name: "Reach-Out",
      description: order.product.name,
      prefill: { name: customer.name, contact: customer.phone, email: customer.email || undefined },
      theme: { color: "#000000" },
      handler: async (response) => {
        try {
          const { code } = await post("/api/orders/verify", response);
          await showTag(code);
        } catch (err) {
          setError(
            err instanceof Error
              ? `${err.message} Your payment reference is ${response.razorpay_payment_id}.`
              : "Payment went through but the tag could not be issued."
          );
        } finally {
          setSubmitting(false);
        }
      },
      modal: {
        ondismiss: () => {
          setError("Payment cancelled — no tag was created and you weren't charged.");
          setSubmitting(false);
        },
      },
    });
    rzp.on("payment.failed", (response) => {
      setError(response?.error?.description ?? "The payment failed. You have not been charged.");
      setSubmitting(false);
    });
    rzp.open();
  }

  if (result) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-3xl border border-emerald-200 bg-emerald-50 p-8 text-center dark:border-emerald-500/30 dark:bg-emerald-500/10">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-3xl text-white">
          ✓
        </span>
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Tag ready</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Your {product.name}{" "}
          <span className="font-mono font-semibold text-slate-900 dark:text-white">
            {result.code}
          </span>{" "}
          is live. We&apos;ll post the printed tag to the address you gave — download the card below
          to use it right away.
        </p>
        <div
          className="w-full max-w-xs overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700"
          style={{ aspectRatio: TAG_CARD_ASPECT }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={result.cardDataUrl} alt={`Tag card ${result.code}`} className="h-full w-full object-contain" />
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <a
            href={result.cardDataUrl}
            download={`${result.code}-tag.png`}
            className="rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-yellow-400 hover:bg-zinc-900"
          >
            Download tag card
          </a>
          <Link
            href={result.url}
            className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-white dark:border-slate-600 dark:text-slate-200"
          >
            View tag page
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {!devBypass && (
        <Script
          src={CHECKOUT_SRC}
          onReady={() => setCheckoutReady(true)}
          onError={() => setError("Could not load the payment window. Check your connection.")}
        />
      )}

      <Stepper steps={steps} current={step} />

      {label === "Start" && (
        <div className="flex flex-col gap-4">
          <div className="rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 p-7 text-white">
            <span className="inline-flex rounded-full bg-yellow-400 px-3 py-1 text-xs font-bold text-black">
              {formatInr(product.pricePaise)}
            </span>
            <h2 className="mt-4 text-3xl font-bold leading-tight">
              Get your {product.name}
              <br />
              delivered to your door
            </h2>
            <p className="mt-3 text-sm text-slate-300">{product.description}</p>
          </div>

          <div className="flex flex-col gap-2">
            <p className="font-medium text-slate-700 dark:text-slate-300">Choose your tag</p>
            {products.map((p) => (
              <label
                key={p.slug}
                className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm transition-colors ${
                  p.slug === product.slug
                    ? "border-yellow-400 bg-yellow-50 dark:bg-yellow-500/10"
                    : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name="product"
                    checked={p.slug === product.slug}
                    onChange={() => {
                      setProduct(p);
                      setVehicleType(defaultVehicleType(p.slug));
                      setError(null);
                    }}
                    className="h-4 w-4 accent-yellow-400"
                  />
                  <span className="text-slate-900 dark:text-white">{p.name}</span>
                </span>
                <span className="font-medium text-slate-600 dark:text-slate-300">
                  {formatInr(p.pricePaise)}
                </span>
              </label>
            ))}
          </div>

          <p className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
            ⓘ Want to try it first?{" "}
            <Link href="/free-tag" className="font-medium text-amber-600 dark:text-yellow-400">
              Get a free eTag
            </Link>{" "}
            as a PDF — no delivery, no payment.
          </p>
        </div>
      )}

      {label === "You" && (
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Your details</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              This is who people reach when they scan the tag.
            </p>
          </div>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-300">Full Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} required className={field} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-300">Email (optional)</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@email.com"
              className={field}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-300">Phone Number</span>
            <PhoneField value={phone} required onChange={setPhone} className={fieldShell} />
          </label>
        </div>
      )}

      {label === "Vehicle" && (
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Vehicle details</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Shown as a masked plate on your tag&apos;s contact page.
            </p>
          </div>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-300">Vehicle Number</span>
            <input
              value={vehicleReg}
              onChange={(e) => setVehicleReg(e.target.value.toUpperCase())}
              placeholder="e.g. DL01AB1234"
              maxLength={20}
              className={`${field} font-mono tracking-wide`}
            />
          </label>
          <div className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-300">Vehicle Type</span>
            <div className="flex flex-wrap gap-2">
              {VEHICLE_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setVehicleType(type)}
                  aria-pressed={vehicleType === type}
                  className={`rounded-xl px-5 py-2.5 text-sm font-medium transition-colors ${
                    vehicleType === type
                      ? "bg-yellow-400 text-black"
                      : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  {vehicleType === type ? "✓ " : ""}
                  {type}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {label === "Address" && (
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
              Delivery address
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Where we post the printed tag. Never shown to anyone who scans it.
            </p>
          </div>
          <AddressFields initialAddress={address} onChange={setAddress} />
          {addressError && (
            <p className="text-xs text-slate-400">
              Everything except the landmark is required — we can&apos;t post the tag without it.
            </p>
          )}
        </div>
      )}

      {paying && (
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Almost done</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Check your details, then pay to have the tag made and posted.
            </p>
          </div>
          <dl className="flex flex-col gap-2 rounded-2xl border border-slate-200 p-4 text-sm dark:border-slate-800">
            {[
              ["Tag", product.name],
              ["Name", customer.name],
              ["Phone", customer.phone],
              ...(hasVehicleStep
                ? [
                    ["Vehicle", customer.vehicleReg || "—"],
                    ["Type", vehicleType],
                  ]
                : []),
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-4">
                <dt className="text-slate-500 dark:text-slate-400">{k}</dt>
                <dd className="font-medium text-slate-900 dark:text-white">{v || "—"}</dd>
              </div>
            ))}
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500 dark:text-slate-400">Deliver to</dt>
              <dd className="whitespace-pre-line text-right font-medium text-slate-900 dark:text-white">
                {address.trim() || "—"}
              </dd>
            </div>
            <div className="mt-1 flex items-center justify-between gap-4 border-t border-slate-200 pt-2 dark:border-slate-800">
              <dt className="font-medium text-slate-700 dark:text-slate-300">Total</dt>
              <dd className="text-lg font-bold text-slate-900 dark:text-white">
                {formatInr(product.pricePaise)}
              </dd>
            </div>
          </dl>

          {devBypass ? (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:bg-yellow-500/10 dark:text-yellow-300">
              Development mode: Razorpay is bypassed — this issues the tag with no real payment.
            </p>
          ) : (
            <p className="text-xs text-slate-400">
              Payments are handled by Razorpay. Your tag is created only after the payment is
              confirmed.
            </p>
          )}
        </div>
      )}

      {error && <p className="text-sm text-rose-500">{error}</p>}

      <div className="flex items-center gap-3">
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            disabled={submitting}
            className="rounded-full border border-slate-300 px-6 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Back
          </button>
        )}
        {paying ? (
          <button
            type="button"
            onClick={handlePay}
            disabled={submitting || (!devBypass && !checkoutReady)}
            className="flex-1 rounded-full bg-yellow-400 px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-yellow-300 disabled:opacity-40"
          >
            {submitting
              ? devBypass
                ? "Generating…"
                : "Opening payment…"
              : devBypass
                ? `Get tag (payment bypassed) — ${formatInr(product.pricePaise)}`
                : `Pay ${formatInr(product.pricePaise)} & get tag`}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            disabled={!canAdvance()}
            className="flex-1 rounded-full bg-yellow-400 px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-yellow-300 disabled:opacity-40"
          >
            {step === 0 ? `Get ${product.name}` : "Continue"}
          </button>
        )}
      </div>
    </div>
  );
}
