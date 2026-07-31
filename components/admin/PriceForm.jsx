"use client";

import { useActionState } from "react";
import { updateProductPrice } from "@/app/admin/actions";

export function PriceForm({ product, priceInr }) {
  const [state, formAction, pending] = useActionState(updateProductPrice, null);

  return (
    <form action={formAction} className="price-form">
      <input type="hidden" name="slug" value={product.slug} />
      <span className="price-prefix">₹</span>
      <input
        name="price"
        type="text"
        inputMode="decimal"
        defaultValue={priceInr}
        aria-label={`Price for ${product.name} in rupees`}
        className="price-input"
      />
      <button type="submit" disabled={pending} className="pill-btn small">
        {pending ? "Saving…" : "Save"}
      </button>
      {state?.ok && <span className="form-success">{state.message}</span>}
      {state?.error && <span className="form-error">{state.error}</span>}
    </form>
  );
}
