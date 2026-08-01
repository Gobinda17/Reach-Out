"use client";

import { useState, useSyncExternalStore } from "react";
import {
  COUNTRIES,
  flagEmoji,
  findCountry,
  detectCountryIso2,
  subscribeToLocale,
  getServerCountryIso2,
} from "@/lib/countryCodes";
import { normalizePhone } from "@/lib/phone";

// Splits a stored E.164 number back into {iso2, digits} for prefilling an
// existing value — longest dial code first, so e.g. "+1..." doesn't wrongly
// match a country whose code is a prefix of another's.
function splitE164(value) {
  if (typeof value !== "string" || !value.startsWith("+")) return null;
  const digits = value.slice(1);
  const byLongestCode = [...COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);
  for (const c of byLongestCode) {
    if (digits.startsWith(c.dialCode)) {
      return { iso2: c.iso2, digits: digits.slice(c.dialCode.length) };
    }
  }
  return null;
}

// The one phone-number input used everywhere in the app: a country-code
// select plus an always-10-digit local number, composed to E.164 through
// normalizePhone(). `onChange` fires with a full, valid E.164 string once
// there are exactly 10 digits, or "" while incomplete/invalid — so a parent
// checking `!value` for "is this field filled in" behaves correctly.
//
// `value` only seeds the initial country + digits (on mount, from an
// existing saved E.164 number) — this is intentionally uncontrolled after
// that, the same way a native `defaultValue` works, since a phone number's
// compound state (country + digits) can't be driven keystroke-by-keystroke
// from a single external string without fighting the input.
export function PhoneField({
  value = "",
  onChange,
  required = false,
  id,
  name,
  disabled = false,
  className = "",
  inputClassName = "",
  selectClassName = "",
}) {
  const [initial] = useState(() => splitE164(value));
  const detectedIso2 = useSyncExternalStore(subscribeToLocale, detectCountryIso2, getServerCountryIso2);
  const [countryOverride, setCountryOverride] = useState(initial?.iso2 ?? null);
  const [digits, setDigits] = useState(initial?.digits ?? "");

  const countryIso2 = countryOverride ?? detectedIso2;
  const country = findCountry(countryIso2);
  const composedValue =
    digits.length === 10 ? (normalizePhone(`+${country.dialCode}${digits}`) ?? "") : "";

  function emit(nextDigits, nextCountry) {
    const composed = nextDigits.length === 10 ? normalizePhone(`+${nextCountry.dialCode}${nextDigits}`) : null;
    onChange?.(composed ?? "");
  }

  function handleDigitsChange(raw) {
    const clean = raw.replace(/\D/g, "").slice(0, 10);
    setDigits(clean);
    emit(clean, country);
  }

  function handleCountryChange(iso2) {
    setCountryOverride(iso2);
    emit(digits, findCountry(iso2));
  }

  return (
    <div className={`flex items-stretch gap-0 ${className}`}>
      {/* Carries the full composed E.164 value for native <form action={...}>
          (FormData) submissions — the visible input below only ever holds the
          10 raw digits, which alone would silently drop the country code. */}
      {name && <input type="hidden" name={name} value={composedValue} />}
      <select
        value={countryIso2}
        onChange={(e) => handleCountryChange(e.target.value)}
        aria-label="Country code"
        disabled={disabled}
        className={`shrink-0 rounded-l-xl border-r border-slate-200 bg-transparent py-2.5 pl-3 pr-2 text-slate-700 outline-none dark:border-slate-700 dark:text-slate-200 ${selectClassName}`}
      >
        {COUNTRIES.map((c) => (
          <option key={c.iso2} value={c.iso2}>
            {flagEmoji(c.iso2)} +{c.dialCode}
          </option>
        ))}
      </select>
      <input
        id={id}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        pattern="\d{10}"
        maxLength={10}
        required={required}
        disabled={disabled}
        placeholder="10-digit mobile number"
        value={digits}
        onChange={(e) => handleDigitsChange(e.target.value)}
        className={`min-w-0 flex-1 rounded-r-xl bg-transparent px-3.5 py-2.5 outline-none ${inputClassName}`}
      />
    </div>
  );
}
