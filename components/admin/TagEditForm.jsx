"use client";

import { useActionState } from "react";
import { CUSTOMER_FIELDS } from "@/lib/customer";
import { updateTag } from "@/app/admin/actions";
import { PhoneField } from "@/components/PhoneField";

// `addressRequired` is false only for a free tag, which is a PDF and gets
// posted nowhere — for everything else the delivery address is mandatory and
// can't be cleared here. Unlike the customer-facing forms this stays a plain
// textarea: an admin correcting an address needs to type it freely.
export function TagEditForm({ tag, addressRequired = true }) {
  const [state, formAction, pending] = useActionState(updateTag, null);

  return (
    <form action={formAction}>
      <input type="hidden" name="code" value={tag.code} />

      <div className="form-grid">
        {CUSTOMER_FIELDS.map((field) => {
          const required = field.required && (field.key !== "address" || addressRequired);
          return (
            <label key={field.key} className="field">
              <span>
                {field.label}
                {required && " *"}
              </span>
              {field.key === "address" || field.key === "notes" ? (
                <textarea
                  name={field.key}
                  rows={2}
                  maxLength={field.key === "address" ? 500 : 2000}
                  defaultValue={tag[field.key] ?? ""}
                  required={required}
                />
              ) : field.key === "phone" ? (
                <PhoneField
                  name="phone"
                  value={tag.phone ?? ""}
                  required={required}
                  className="phone-field-shell"
                />
              ) : (
                <input
                  name={field.key}
                  type={field.key === "email" ? "email" : "text"}
                  maxLength={field.key === "name" ? 100 : field.key === "vehicleReg" ? 20 : 100}
                  defaultValue={tag[field.key] ?? ""}
                  required={required}
                />
              )}
            </label>
          );
        })}
      </div>

      <div className="form-actions">
        <button type="submit" disabled={pending} className="pill-btn">
          {pending ? "Saving…" : "Save changes"}
        </button>
        {state?.ok && <span className="form-success">{state.message}</span>}
        {state?.error && <span className="form-error">{state.error}</span>}
      </div>
    </form>
  );
}
