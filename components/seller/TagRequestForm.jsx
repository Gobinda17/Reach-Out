"use client";

import { useActionState } from "react";
import { requestTags } from "@/app/seller/actions";

export function TagRequestForm({ products, maxQuantity }) {
  const [state, formAction, pending] = useActionState(requestTags, null);

  return (
    <form action={formAction}>
      <div className="form-grid">
        <label className="field">
          <span>Quantity *</span>
          <input name="quantity" type="number" min={1} max={maxQuantity} defaultValue={25} required />
        </label>

        <label className="field">
          <span>Product *</span>
          <select
            name="product"
            className="select-control"
            style={{ padding: "0.4rem 0.6rem", fontSize: "0.82rem" }}
          >
            {products.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.name}
              </option>
            ))}
          </select>
        </label>

        <label className="field" style={{ gridColumn: "1 / -1" }}>
          <span>Note to admin</span>
          <textarea
            name="note"
            rows={2}
            maxLength={500}
            placeholder="Where these are going, when you need them by…"
          />
        </label>
      </div>

      <div className="form-actions">
        <button type="submit" disabled={pending || products.length === 0} className="pill-btn">
          {pending ? "Sending…" : "Request tags"}
        </button>
        {state?.ok && <span className="form-success">{state.message}</span>}
        {state?.error && <span className="form-error">{state.error}</span>}
      </div>

      {products.length === 0 && (
        <p className="kpi-sub" style={{ marginTop: "0.5rem" }}>
          No products are available to request right now.
        </p>
      )}
    </form>
  );
}
