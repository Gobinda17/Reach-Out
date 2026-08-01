# Reach-Out

A privacy-first contact-tag service. A user gets a physical QR/NFC tag (for a vehicle, etc.); anyone who scans it can call or message the owner without ever seeing their name, phone number, or address.

Next.js App Router (JavaScript, not TypeScript), Prisma + PostgreSQL, Tailwind v4, phone+OTP auth (no passwords). See [`CLAUDE.md`](./CLAUDE.md) for the full architecture writeup.

## Getting started

1. Create `.env` with at least:
   ```
   DATABASE_URL="postgresql://user:password@localhost:5432/reach_out"
   SESSION_SECRET="<any random string>"
   ```
   Optional dev bypasses (`OTP_DEV_MODE`, `RAZORPAY_DEV_MODE`, `CALL_PROVIDER`) are documented in `CLAUDE.md`.

2. Install dependencies and set up the database:
   ```bash
   npm install
   npx prisma migrate dev
   npm run db:seed   # creates an admin + a sales account, see prisma/seed.mjs
   ```

3. Start the dev server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

## Commands

```bash
npm run dev                          # start dev server (Turbopack)
npm run build                        # production build
npm run lint                         # eslint

npx prisma migrate dev --name X      # create + apply a migration after editing prisma/schema.prisma
npx prisma migrate deploy            # apply existing migrations only (prod/CI), never generates new ones
npx prisma generate                  # regenerate the Prisma client after any schema change
npx prisma migrate reset             # drop, reapply all migrations, then auto-run the seed
npm run db:seed                      # seed two staff accounts (admin + sales)
```

There is no test suite configured in this repo.

**Windows:** `npx prisma generate` fails with `EPERM ... query_engine-windows.dll.node` if the dev server is currently running (it holds the DLL open). Stop the dev server, run `prisma generate`, then restart it.

## Learn more

- [Next.js Documentation](https://nextjs.org/docs)
- This project is a modified Next.js fork with different conventions from stock Next.js — see [`AGENTS.md`](./AGENTS.md) before assuming an API matches upstream docs.
