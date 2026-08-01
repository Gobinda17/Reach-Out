"use client";

import { useState } from "react";
import { CUSTOMER_FIELDS, composeIndianAddress, parseIndianAddress } from "@/lib/customer";
import { INDIAN_STATES } from "@/lib/indianStates";

const fieldClass =
  "rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-slate-900 outline-none transition-colors focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 disabled:bg-slate-50 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-yellow-500 dark:focus:ring-yellow-500/20 dark:disabled:bg-slate-800/60";

// Indian addresses are collected as separate fields (house/street, locality,
// landmark, city, state, PIN) — the conventional order on Indian forms — then
// joined into the single `address` string a Tag row stores. `initialAddress`
// (the previous tag's saved address, if any) seeds these on first render only —
// the fields are otherwise uncontrolled by `value.address` so typing stays smooth.
function AddressFields({ onChange, disabled, initialAddress }) {
  const [parts, setParts] = useState(() => parseIndianAddress(initialAddress));

  function update(key, val) {
    const next = { ...parts, [key]: val };
    setParts(next);
    onChange(composeIndianAddress(next));
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        className={fieldClass}
        type="text"
        placeholder="Flat / House no., Building, Street"
        value={parts.line1}
        disabled={disabled}
        onChange={(e) => update("line1", e.target.value)}
      />
      <input
        className={fieldClass}
        type="text"
        placeholder="Locality / Area"
        value={parts.line2}
        disabled={disabled}
        onChange={(e) => update("line2", e.target.value)}
      />
      <input
        className={fieldClass}
        type="text"
        placeholder="Landmark (optional)"
        value={parts.landmark}
        disabled={disabled}
        onChange={(e) => update("landmark", e.target.value)}
      />
      <div className="grid grid-cols-2 gap-3">
        <input
          className={fieldClass}
          type="text"
          placeholder="City"
          value={parts.city}
          disabled={disabled}
          onChange={(e) => update("city", e.target.value)}
        />
        <input
          className={fieldClass}
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder="PIN code"
          value={parts.pincode}
          disabled={disabled}
          onChange={(e) => update("pincode", e.target.value.replace(/\D/g, ""))}
        />
      </div>
      <select
        className={fieldClass}
        value={parts.state}
        disabled={disabled}
        onChange={(e) => update("state", e.target.value)}
      >
        <option value="">State</option>
        {INDIAN_STATES.map((state) => (
          <option key={state} value={state}>
            {state}
          </option>
        ))}
      </select>
    </div>
  );
}

export function CustomerForm({ value, onChange, disabledFields }) {
  return (
    <div className="flex flex-col gap-4">
      {CUSTOMER_FIELDS.map((field) =>
        field.key === "address" ? (
          <div key={field.key} className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {field.label}
              {field.required && <span className="text-rose-500"> *</span>}
            </span>
            <p className="-mt-1 text-xs text-slate-400">
              We&apos;ll deliver your tag to this address.
            </p>
            <AddressFields
              disabled={disabledFields}
              initialAddress={value.address}
              onChange={(address) => onChange({ ...value, address })}
            />
          </div>
        ) : (
          <label key={field.key} className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {field.label}
              {field.required && <span className="text-rose-500"> *</span>}
            </span>
            {field.key === "notes" ? (
              <textarea
                className={fieldClass}
                rows={2}
                value={value[field.key]}
                disabled={disabledFields}
                onChange={(e) => onChange({ ...value, [field.key]: e.target.value })}
              />
            ) : (
              <input
                className={fieldClass}
                type={field.key === "email" ? "email" : field.key === "phone" ? "tel" : "text"}
                value={value[field.key]}
                disabled={disabledFields}
                onChange={(e) => onChange({ ...value, [field.key]: e.target.value })}
              />
            )}
          </label>
        )
      )}
    </div>
  );
}
