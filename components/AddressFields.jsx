"use client";

import { useState } from "react";
import { addressPartErrors, composeIndianAddress, parseIndianAddress } from "@/lib/customer";
import { INDIAN_STATES } from "@/lib/indianStates";

const fieldClass =
  "rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-slate-900 outline-none transition-colors focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 disabled:bg-slate-50 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-yellow-500 dark:focus:ring-yellow-500/20 dark:disabled:bg-slate-800/60";

const invalidClass =
  "border-rose-400 focus:border-rose-400 focus:ring-rose-100 dark:border-rose-500 dark:focus:border-rose-500 dark:focus:ring-rose-500/20";

// Indian addresses are collected as separate fields (house/street, locality,
// landmark, city, state, PIN) — the conventional order on Indian forms — then
// joined into the single `address` string a Tag row stores. `initialAddress`
// (the previous tag's saved address, if any) seeds these on first render only —
// the fields are otherwise uncontrolled by `value.address` so typing stays smooth.
//
// Everything but the landmark is mandatory when `required` (the default): the
// tag is posted to this address. Free products ship nothing and pass
// `required={false}`. Errors only show once a field has been blurred, so the
// form doesn't turn red before it has been filled in.
export function AddressFields({ onChange, disabled, initialAddress, required = true }) {
  const [parts, setParts] = useState(() => parseIndianAddress(initialAddress));
  const [touched, setTouched] = useState({});

  const errors = required ? addressPartErrors(parts) : {};

  function update(key, val) {
    const next = { ...parts, [key]: val };
    setParts(next);
    onChange(composeIndianAddress(next));
  }

  // Shared wiring for one part: red border + message once it's been blurred.
  function partProps(key) {
    const invalid = touched[key] && errors[key];
    return {
      className: `${fieldClass} ${invalid ? invalidClass : ""}`,
      disabled,
      "aria-invalid": invalid ? true : undefined,
      onBlur: () => setTouched((t) => ({ ...t, [key]: true })),
      onChange: (e) => update(key, e.target.value),
    };
  }

  // Not a component — inlined markup, so it does not remount on every render.
  function partError(key) {
    if (!touched[key] || !errors[key]) return null;
    return <span className="text-xs text-rose-500">{errors[key]}</span>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <input
          {...partProps("line1")}
          type="text"
          placeholder={`Flat / House no., Building, Street${required ? " *" : ""}`}
          value={parts.line1}
        />
        {partError("line1")}
      </div>
      <div className="flex flex-col gap-1">
        <input
          {...partProps("line2")}
          type="text"
          placeholder={`Locality / Area${required ? " *" : ""}`}
          value={parts.line2}
        />
        {partError("line2")}
      </div>
      <input
        {...partProps("landmark")}
        type="text"
        placeholder="Landmark (optional)"
        value={parts.landmark}
      />
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <input
            {...partProps("city")}
            type="text"
            placeholder={`City${required ? " *" : ""}`}
            value={parts.city}
          />
          {partError("city")}
        </div>
        <div className="flex flex-col gap-1">
          <input
            {...partProps("pincode")}
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder={`PIN code${required ? " *" : ""}`}
            value={parts.pincode}
            onChange={(e) => update("pincode", e.target.value.replace(/\D/g, ""))}
          />
          {partError("pincode")}
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <select {...partProps("state")} value={parts.state}>
          <option value="">{required ? "State *" : "State"}</option>
          {INDIAN_STATES.map((state) => (
            <option key={state} value={state}>
              {state}
            </option>
          ))}
        </select>
        {partError("state")}
      </div>
    </div>
  );
}
