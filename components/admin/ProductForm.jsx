"use client";

import { useActionState } from "react";
import { createProduct, updateProduct } from "@/app/admin/actions";

function toInrInput(pricePaise) {
  return pricePaise % 100 === 0 ? String(pricePaise / 100) : (pricePaise / 100).toFixed(2);
}

// `product` absent → create form. Present → edit form with a fixed slug, since
// orders and tags already recorded that slug.
export function ProductForm({ product }) {
  const editing = Boolean(product);
  const [state, formAction, pending] = useActionState(
    editing ? updateProduct : createProduct,
    null
  );

  return (
    <form action={formAction}>
      {editing && <input type="hidden" name="slug" value={product.slug} />}

      <div className="form-grid">
        <label className="field">
          <span>Name *</span>
          <input name="name" defaultValue={product?.name ?? ""} required />
        </label>

        <label className="field">
          <span>Slug {editing ? "(fixed)" : "(optional — from name)"}</span>
          <input
            name="slug"
            defaultValue={product?.slug ?? ""}
            placeholder="vehicle-tag"
            disabled={editing}
          />
        </label>

        <label className="field">
          <span>Price in ₹ *</span>
          <input
            name="price"
            type="text"
            inputMode="decimal"
            defaultValue={product ? toInrInput(product.pricePaise) : ""}
            placeholder="199"
            required
          />
        </label>

        <label className="field">
          <span>Sort order</span>
          <input
            name="sortOrder"
            type="number"
            min="0"
            max="9999"
            defaultValue={product?.sortOrder ?? 0}
          />
        </label>

        <label className="field" style={{ gridColumn: "1 / -1" }}>
          <span>Description *</span>
          <textarea
            name="description"
            rows={2}
            defaultValue={product?.description ?? ""}
            required
          />
        </label>
      </div>

      <label className="checkbox-field">
        <input type="checkbox" name="active" defaultChecked={product ? product.active : true} />
        <span>
          Available — shown on the site and buyable. Untick to retire it without losing history.
        </span>
      </label>

      <div className="form-actions">
        <button type="submit" disabled={pending} className="pill-btn">
          {pending ? "Saving…" : editing ? "Save changes" : "Create product"}
        </button>
        {state?.ok && <span className="form-success">{state.message}</span>}
        {state?.error && <span className="form-error">{state.error}</span>}
      </div>
    </form>
  );
}
