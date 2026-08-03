# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What this is

Reach-Out: a privacy-first contact-tag service. A user gets a physical QR/NFC tag (for a vehicle, etc.); anyone who scans it can call or message the owner without ever seeing their name, phone number, or address. Next.js App Router (JS, not TS), Prisma + PostgreSQL, Tailwind v4, phone+OTP auth (no passwords). Brand is black/yellow throughout (see "Design system" below).

**This is a modified Next.js fork** (see `AGENTS.md`, imported above) — file conventions differ from stock Next.js. The concrete example already in this repo: route protection lives in `proxy.js` at the project root, not `middleware.js` (that convention was renamed in this fork). Check `node_modules/next/dist/docs/` before assuming an API/convention matches your training data.

## Commands

```bash
npm run dev                          # start dev server (Turbopack)
npm run build                        # production build
npm run lint                         # eslint

npx prisma migrate dev --name X      # create + apply a migration after editing prisma/schema.prisma
npx prisma migrate deploy            # apply existing migrations only (prod/CI), never generates new ones
npx prisma generate                  # regenerate the client (needed after any schema change)
npx prisma migrate reset             # drop, reapply all migrations, then auto-run the seed
npm run db:seed                      # seed two staff accounts (admin + sales) — see prisma/seed.mjs
```

There is no test suite/runner configured in this repo.

**Windows gotcha:** `npx prisma generate` fails with `EPERM ... query_engine-windows.dll.node` if the dev server is currently running (it holds the DLL open). Stop the dev server, run `prisma generate`, then restart it.

### Required env vars (`.env`)

`DATABASE_URL`, `SESSION_SECRET` (signs the session JWT and hashes OTP codes — required even in dev). Everything else below is also overridable at runtime from `/admin/settings` without a redeploy — see "Runtime settings" — the env var is just the pre-first-configuration fallback:
- `OTP_DEV_MODE=true` — every OTP is the fixed code `111111` (`lib/otp.js`); otherwise the code is only logged server-side (`lib/sms.js` has no real SMS provider wired up).
- `RAZORPAY_DEV_MODE=true` — paid orders skip Razorpay and are issued as already-paid (`lib/razorpay.js`); otherwise `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` are required.
- `CALL_PROVIDER` — `dev` (default, unset) allocates a fake non-dialable virtual number; `edesy` (with `CALLMASK_API_KEY`) uses the real masking.edesy.in Session API. See `lib/calling.js`.

## Architecture

### Auth

Phone + OTP only, no passwords, no separate signup — `POST /api/auth/verify-otp` does `prisma.user.upsert`, so a new phone number verifying an OTP *is* registration. Session is a signed JWT (`jose`) in an httpOnly cookie (`lib/session.js`).

`proxy.js` is the first-pass route guard: protects `/generate`, `/admin/*`, `/dashboard`, `/invoices/*`, and `/t/:code/claim` (regex-matched since it's a dynamic segment), redirecting to `/login?next=<original path>`. **It is not the only gate** — every protected Server Component and every Server Action in `app/admin/actions.js` independently re-checks auth via `lib/dal.js` (`verifySession`, `getCurrentUser`, `getAdmin`), because Server Actions are directly POST-reachable and bypass `proxy.js`'s route matching entirely. Keep this double-check when adding new protected pages/actions — it's a deliberate, consistently-applied pattern, not redundancy to clean up.

### Phone numbers — one pattern, used everywhere

`lib/phone.js`'s `normalizePhone()` is the only correct way to validate/store a phone number: accepts a bare 10-digit Indian mobile or any `+`/`00`-prefixed E.164 number, returns `null` (not a throw) if invalid. `components/PhoneField.jsx` is the one UI for collecting a phone number — a country-code `<select>` (defaulting to a `navigator.language`-detected country, via `lib/countryCodes.js`) plus an always-10-digit local number input, composed to E.164 through `normalizePhone`. Used in every form that collects a phone number, both the Tailwind-styled customer-facing forms and the `admin.css`-styled admin forms (via the `.phone-field-shell` CSS class).

`PhoneField`'s visible input only ever holds the raw 10 digits — for native `<form action={serverAction}>` submissions (the admin forms), pass a `name` prop and read the *hidden* input it renders alongside the visible one (`formData.get(name)`), since the visible input alone would submit just the digits and silently drop the country code.

`lib/tags.js`'s `sanitizeCustomer()` (used by the generate, claim-tag, and admin tag-edit flows) normalizes phone via `normalizePhone` when it's valid; every API boundary that calls it independently re-validates and rejects bad input — client-side checks alone are always bypassable by calling the API directly.

### Route groups

- `app/(marketing)/*` — public/customer pages, share `SiteHeader`/`SiteFooter` via `app/(marketing)/layout.jsx`.
- `app/admin/*` — separate `AdminShell` sidebar/topbar layout (`app/admin/layout.jsx`), unrelated to the marketing chrome. Add new sections to `AdminShell`'s `NAV` array.
- `app/t/[code]`, `app/invoices/[orderId]`, and `app/api/*` — outside both layouts, use the bare root `app/layout.jsx`.

The admin app is a **separate design system**, not Tailwind: `app/admin/admin.css` defines its own CSS custom properties (`--accent`, `--surface`, etc.) and a manual `data-theme="light"|"dark"` toggle persisted to `localStorage`. This is intentionally independent of Tailwind's `dark:` variant, which in this project follows OS `prefers-color-scheme` (no `darkMode: 'class'` config) — embedding a Tailwind-styled component that relies on `dark:` inside the admin shell will desync from the admin's own toggle.

**`beforeInteractive` scripts must live in the root layout, not a nested one.** The admin theme-flash-prevention script (reads `localStorage` before paint so a light-theme admin never sees a flash of the dark shell) lives in `app/layout.jsx`, guarded to no-op when `#adminApp` doesn't exist on the page. It used to live in `app/admin/layout.jsx`, which worked on a full page load but broke — React's "script tag encountered while rendering" warning — when `/admin/*` was reached via client-side navigation from a marketing page, since a nested layout's `beforeInteractive` script only actually runs before-interactive if that layout happens to be part of the very first page load.

Server Actions in `app/admin/actions.js` follow a `fail(message)` / `done(message)` return shape consumed by `useActionState` in matching `components/admin/*Form.jsx` components. Bulk actions that operate on a dynamic set of selected rows (not a static form) are plain exported async functions called directly from a client component instead (e.g. `markTagsShipped`, `markTagsDownloaded`), not through `useActionState`. Every admin list page (`orders`, `users`, `products`, `tags`, `fulfillment`) follows the same server-side search convention: a `?q=` param trimmed and turned into a Prisma `OR` `contains` filter (see `app/admin/tags/page.jsx` for the fullest example, including pagination and status-tab counts that respect the current search term), submitted via a plain `<form className="search-form">` — no client-side debounce or `useState`.

### The Tag lifecycle (the trickiest part of the domain)

`Tag` is the central entity (`prisma/schema.prisma`). It reaches a real owner + address through one of two paths, distinguished by `Tag.claimedAt`:

1. **Self-service** (`/generate`, paid or free): the logged-in customer fills in full details up front; `createTag()` (`lib/tags.js`) sets `createdById` and all customer fields together. `claimedAt` stays `null` forever.
2. **Bulk-generated blank stock**: admin creates tags with only a `code` and `product`, no owner (`createBlankTag()`), meant for physical retail/dealer handout. `/t/[code]` shows a "Claim this tag" CTA for these; claiming (`/t/[code]/claim`, requires login) calls `claimTag()`, which sets `createdById` + customer fields + `claimedAt` all at once.

So `claimedAt === null` (with an address set) means a self-service order that Reach-Out still needs to physically ship — that's the admin **Fulfillment** page (`/admin/fulfillment`, tracked via `Tag.shippedAt`). `claimedAt !== null` means the tag was claimed off blank stock — the claimant already has the physical tag in hand by definition, so it never needs shipping, but is tracked via `Tag.downloadedAt` on the tags page's **Registered** tab (for exporting card+address batches). Don't conflate these two states when adding fulfillment-adjacent features.

`sanitizeCustomer()` and `CUSTOMER_FIELDS` (`lib/customer.js`) are the single source of truth for which fields a Tag's contact info has — shared between the self-service `CustomerForm` and the admin `TagEditForm`. Indian addresses are collected as structured fields (line1/line2/landmark/city/state/pincode) in `CustomerForm` and composed into the single `Tag.address` string via `composeIndianAddress`/`parseIndianAddress` — that compose format is fixed-position (always exactly 4 `\n`-joined lines, blanks included) specifically so it round-trips through `parseIndianAddress` for prefilling a later form; don't change it to a variable-length format without updating the parser. Because that format is *positional*, an address must never be trimmed as a whole string — `normalizeAddress()` trims each line instead, since dropping a leading blank line (an address with no house/street) would shift every other line up one. That's why `sanitizeCustomer` treats `address` differently from every other field it shapes.

**The delivery address is mandatory for every tag except a free one**, and every part of it except the landmark is required (`validateAddress` / `REQUIRED_ADDRESS_PARTS` in `lib/customer.js` — the one check the wizard, the claim form and the API routes all share, so the browser and the server can't disagree). Free means `pricePaise === 0`, read from the `Product` row, not a hardcoded slug: a free tag is a PDF and posts nothing. Enforced in three places on purpose — `AddressFields` (per-field errors, shown on blur), the API boundaries (`/api/orders`, `/api/tags`, `/api/tags/[code]/claim`, plus `updateTag` in `app/admin/actions.js`), and a Postgres trigger (`20260804101500_tag_delivery_address_required`) that refuses to write an owned, non-free tag with no address. The trigger is a trigger and not a `CHECK` because free-ness lives in another table; it only asks "is there an address at all", leaving the field-level rule to the app, and it fires on update only when `address`/`createdById`/`product` actually change so unrelated writes (`shippedAt`, seller assignment) never trip over older rows. The admin `TagEditForm` keeps a free-text textarea rather than the structured fields, so `updateTag` only presence-checks — an admin correcting an address needs to type it freely.

### Payments, money, and invoices

Prices are stored in paise (`Int`) everywhere; `formatInr`/`formatAmount` (`lib/products.js`) format for display. `Order.amountPaise` is always priced server-side from the `Product` table at charge time — never trust an amount from the client. `Order` → `Tag` is 1:1 (`Order.tagId`); the tag is only minted after Razorpay's signature verifies (`app/api/orders/verify/route.js` → `issuePaidTag()` in `lib/orders.js`), or immediately under `RAZORPAY_DEV_MODE`. The admin Orders page is read-only by design (comment in the file) — it's the payment record; fulfillment/shipping state lives on `Tag`, not `Order`.

`app/invoices/[orderId]/page.jsx` renders a print-optimized invoice for a single order — gated so only the order's own buyer or an admin can view it (`notFound()` otherwise). "Download as PDF" is the browser's native `window.print()`, not a PDF library, consistent with "Printable/downloadable assets" below.

### Privacy model (don't regress this)

The public `/t/[code]` page and the in-app `/scan` lookup (`GET /api/tags/[code]`) never return a tag owner's name, phone, email, address, or notes — only non-identifying vehicle info. Contact happens via masked calling (`lib/calling.js`) or `ScanMessage` (the owner never learns the sender's identity unless the sender opts to share it). The printable tag card (`composeTagCard` in `lib/tagCard.js`) deliberately never prints the owner's name — only the tag code + QR. Internal admin exports (fulfillment sheets, the Registered-tab CSV) are the one place name/address are intentionally included, since those are ops documents, not anything a scanner sees.

**Scan tokens** (`lib/scanToken.js`): a short-lived (10 min) signed JWT, issued only when the contact card actually renders (`/t/[code]`'s server render, or the `GET /api/tags/[code]` lookup `/scan` uses), and required by both `POST /api/tags/[code]/call` and `POST /api/tags/[code]/message`. This doesn't hide the tag code itself (it's printed on the physical tag, and the QR has to encode a static URL) — it stops those two endpoints being hit directly with just the code, long after any real visit. Both endpoints also have their own in-memory rate limit (`lib/callRateLimit.js`, 5 per 15 min per tag).

### Masked calling

`lib/calling.js` exports `CALL_PROVIDERS` (currently `dev` and `edesy`) and `allocateVirtualNumber()`. `CallOwnerPanel.jsx` still collects the caller's phone number before requesting a call — it's stored on the `Call` row (`callerPhone`) and used to resolve routing later — but it's never sent to the provider up front. The `edesy` provider is a *static* pool: DIDs are bought and routing-configured once in edesy's own dashboard (each set to hit `app/api/webhooks/edesy/route.js` for live routing decisions), listed in the `CALLMASK_NUMBERS` setting (comma-separated E.164), and `allocateVirtualNumber()` just hands out whichever configured number isn't tied to an active, unexpired `Call`. This replaced an earlier design that called edesy's Session API (`POST /masking/sessions`) to allocate an ephemeral number per call with both real numbers bound up front — that approach consistently failed with "no masking numbers enrolled" because that dynamic session pool turned out to be a separate resource from dashboard-configured DIDs. See `app/api/webhooks/edesy/route.js` for how an inbound call to one of those DIDs actually gets bridged: edesy POSTs caller + masked number to that endpoint in real time, and it resolves the target by matching the `Call` row's `callerPhone`/the tag owner's phone. `app/api/webhooks/edesy/events/route.js` is a separate, optional account-wide webhook for call lifecycle events (`call.connected`, `call.missed`, `call.ended`, `session.expired`) that updates `Call.status`. Adding a new provider means adding a case to `allocateVirtualNumber()` and a new entry in `CALL_PROVIDERS`; an admin can then switch to it from `/admin/settings` without a redeploy, but the integration code itself still has to be written — the settings page only switches between providers that already exist in code.

### Runtime settings (`/admin/settings`)

`lib/settings.js`'s `Setting` model (key/value in Postgres) overrides the matching env var at runtime — `lib/calling.js`, `lib/otp.js`, and `lib/razorpay.js` all check `getSetting(key, process.env.KEY)` first. This is what lets an admin flip `OTP_DEV_MODE`, switch the call-masking provider, or rotate API keys from the UI instead of asking a developer to edit `.env` and redeploy. Secrets are never echoed back into the form — a saved value shows a "leave blank to keep it" placeholder instead of the real key (`app/admin/actions.js`'s `updateSettings`, `components/admin/SettingsForm.jsx`).

### Design system

Public/customer pages are black-and-yellow Tailwind: `bg-black`/`text-yellow-400` for primary buttons and the brand mark (never theme-dependent — same colors in light and dark mode, deliberately, since a logo shouldn't lose contrast when a user's OS theme changes), `amber-600`/`yellow-400` for accents (amber for text on white — pure yellow fails contrast there). `components/Logo.jsx` (+ `ReachIcon` in `components/icons.jsx`) is the brand mark; pass `theme="light"` when embedding it on a surface that's fixed white/yellow regardless of site theme (e.g. the printable tag card), since the default `theme="auto"` follows Tailwind `dark:` and would go white-on-white there.

### Printable/downloadable assets

Composed client-side on `<canvas>` — no server-side image rendering library. `lib/tagCard.js` has the customer-facing tag card + single-tag/bulk-ZIP downloads; `lib/adminSheets.js` has the internal fulfillment sheet (QR + name/address/phone per cell) and CSV export. Bulk ZIPs use `jszip`, lazy-loaded via dynamic `import()` since only bulk admin actions need it. Invoices are the one exception — a print-optimized HTML page via `window.print()`, not canvas, since a tabular billing document doesn't fit the canvas-text-wrapping approach the way a QR-centric tag card does.

### Misc

- Tag codes are 6-char Crockford base32 (`lib/tagCode.js`), collision-checked against the DB on generation.
- In-memory rate limiters (`lib/otp.js`, `lib/callRateLimit.js`) reset on restart and aren't shared across instances — acceptable at this app's current scale, called out in comments as the thing to swap for Redis if that changes.
