# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What this is

Reach-Out ("Sampark"): a privacy-first contact-tag service. A user gets a physical QR/NFC tag (for a vehicle, etc.); anyone who scans it can call or message the owner without ever seeing their name, phone number, or address. Next.js App Router (JS, not TS), Prisma + PostgreSQL, Tailwind v4, phone+OTP auth (no passwords).

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

`DATABASE_URL`, `SESSION_SECRET` (signs the session JWT and hashes OTP codes — required even in dev). Optional dev bypasses, all default to off/unset in a real deploy:
- `OTP_DEV_MODE=true` — every OTP is the fixed code `111111` (`lib/otp.js`); otherwise the code is only logged server-side (`lib/sms.js` has no real SMS provider wired up).
- `RAZORPAY_DEV_MODE=true` — paid orders skip Razorpay and are issued as already-paid (`lib/razorpay.js`); otherwise `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` are required.
- `CALL_PROVIDER` unset — masked-calling allocates a fake, non-dialable virtual number (`lib/calling.js`); no real provider is implemented yet.

## Architecture

### Auth

Phone + OTP only, no passwords, no separate signup — `POST /api/auth/verify-otp` does `prisma.user.upsert`, so a new phone number verifying an OTP *is* registration. Session is a signed JWT (`jose`) in an httpOnly cookie (`lib/session.js`).

`proxy.js` is the first-pass route guard: protects `/generate`, `/admin/*`, `/dashboard`, and `/t/:code/claim` (regex-matched since it's a dynamic segment), redirecting to `/login?next=<original path>`. **It is not the only gate** — every protected Server Component and every Server Action in `app/admin/actions.js` independently re-checks auth via `lib/dal.js` (`verifySession`, `getCurrentUser`, `getAdmin`), because Server Actions are directly POST-reachable and bypass `proxy.js`'s route matching entirely. Keep this double-check when adding new protected pages/actions — it's a deliberate, consistently-applied pattern, not redundancy to clean up.

### Route groups

- `app/(marketing)/*` — public/customer pages, share `SiteHeader`/`SiteFooter` via `app/(marketing)/layout.jsx`.
- `app/admin/*` — separate `AdminShell` sidebar/topbar layout (`app/admin/layout.jsx`), unrelated to the marketing chrome. Add new sections to `AdminShell`'s `NAV` array.
- `app/t/[code]` and `app/api/*` — outside both layouts, use the bare root `app/layout.jsx`.

The admin app is a **separate design system**, not Tailwind: `app/admin/admin.css` defines its own CSS custom properties (`--accent`, `--surface`, etc.) and a manual `data-theme="light"|"dark"` toggle persisted to `localStorage`. This is intentionally independent of Tailwind's `dark:` variant, which in this project follows OS `prefers-color-scheme` (no `darkMode: 'class'` config) — embedding a Tailwind-styled component that relies on `dark:` inside the admin shell will desync from the admin's own toggle.

Server Actions in `app/admin/actions.js` follow a `fail(message)` / `done(message)` return shape consumed by `useActionState` in matching `components/admin/*Form.jsx` components. Bulk actions that operate on a dynamic set of selected rows (not a static form) are plain exported async functions called directly from a client component instead (e.g. `markTagsShipped`, `markTagsDownloaded`), not through `useActionState`.

### The Tag lifecycle (the trickiest part of the domain)

`Tag` is the central entity (`prisma/schema.prisma`). It reaches a real owner + address through one of two paths, distinguished by `Tag.claimedAt`:

1. **Self-service** (`/generate`, paid or free): the logged-in customer fills in full details up front; `createTag()` (`lib/tags.js`) sets `createdById` and all customer fields together. `claimedAt` stays `null` forever.
2. **Bulk-generated blank stock**: admin creates tags with only a `code` and `product`, no owner (`createBlankTag()`), meant for physical retail/dealer handout. `/t/[code]` shows a "Claim this tag" CTA for these; claiming (`/t/[code]/claim`, requires login) calls `claimTag()`, which sets `createdById` + customer fields + `claimedAt` all at once.

So `claimedAt === null` (with an address set) means a self-service order that Reach-Out still needs to physically ship — that's the admin **Fulfillment** page (`/admin/fulfillment`, tracked via `Tag.shippedAt`). `claimedAt !== null` means the tag was claimed off blank stock — the claimant already has the physical tag in hand by definition, so it never needs shipping, but is tracked via `Tag.downloadedAt` on the tags page's **Registered** tab (for exporting card+address batches). Don't conflate these two states when adding fulfillment-adjacent features.

`sanitizeCustomer()` and `CUSTOMER_FIELDS` (`lib/customer.js`) are the single source of truth for which fields a Tag's contact info has — shared between the self-service `CustomerForm` and the admin `TagEditForm`. Indian addresses are collected as structured fields (line1/line2/landmark/city/state/pincode) in `CustomerForm` and composed into the single `Tag.address` string via `composeIndianAddress`/`parseIndianAddress` — that compose format is fixed-position (always exactly 4 `\n`-joined lines, blanks included) specifically so it round-trips through `parseIndianAddress` for prefilling a later form; don't change it to a variable-length format without updating the parser.

### Payments and money

Prices are stored in paise (`Int`) everywhere; `formatInr`/`formatAmount` (`lib/products.js`) format for display. `Order.amountPaise` is always priced server-side from the `Product` table at charge time — never trust an amount from the client. `Order` → `Tag` is 1:1 (`Order.tagId`); the tag is only minted after Razorpay's signature verifies (`app/api/orders/verify/route.js` → `issuePaidTag()` in `lib/orders.js`), or immediately under `RAZORPAY_DEV_MODE`. The admin Orders page is read-only by design (comment in the file) — it's the payment record; fulfillment/shipping state lives on `Tag`, not `Order`.

### Privacy model (don't regress this)

The public `/t/[code]` page and the in-app `/scan` lookup (`GET /api/tags/[code]`) never return a tag owner's name, phone, email, address, or notes — only non-identifying vehicle info. Contact happens via masked calling (`lib/calling.js` allocates a temporary virtual number) or `ScanMessage` (the owner never learns the sender's identity unless the sender opts to share it). The printable tag card (`composeTagCard` in `lib/tagCard.js`) deliberately never prints the owner's name — only the tag code + QR. Internal admin exports (fulfillment sheets, the Registered-tab CSV) are the one place name/address are intentionally included, since those are ops documents, not anything a scanner sees.

### Printable/downloadable assets

Composed client-side on `<canvas>` — no server-side image rendering library. `lib/tagCard.js` has the customer-facing tag card + single-tag/bulk-ZIP downloads; `lib/adminSheets.js` has the internal fulfillment sheet (QR + name/address/phone per cell) and CSV export. Bulk ZIPs use `jszip`, lazy-loaded via dynamic `import()` since only bulk admin actions need it.

### Misc

- Tag codes are 6-char Crockford base32 (`lib/tagCode.js`), collision-checked against the DB on generation.
- In-memory rate limiters (`lib/otp.js`, `lib/callRateLimit.js`) reset on restart and aren't shared across instances — acceptable at this app's current scale, called out in comments as the thing to swap for Redis if that changes.
