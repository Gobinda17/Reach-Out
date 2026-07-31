# Sampark Clone — Technical Implementation Document

**Stack:** React + Express + PostgreSQL + JavaScript (ESM)
**Prepared for:** Gobinda / Cybernet
**Reference product:** [sampark.me](https://sampark.me) by NGF132 Pvt Ltd
**Version:** 3.0 (JavaScript edition — supersedes v2.0)
**Date:** July 2026

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Anatomy](#2-product-anatomy)
3. [Tech Stack](#3-tech-stack)
4. [Monorepo Structure](#4-monorepo-structure)
5. [System Architecture](#5-system-architecture)
6. [Database Schema (Prisma)](#6-database-schema-prisma)
7. [Authentication System (OTP + JWT)](#7-authentication-system-otp--jwt)
8. [Core Flow — Scan to Contact](#8-core-flow--scan-to-contact)
9. [Core Flow — Masked Calling (Exotel)](#9-core-flow--masked-calling-exotel)
10. [Core Flow — WhatsApp Routing](#10-core-flow--whatsapp-routing)
11. [Multi-Channel Sales & Activation](#11-multi-channel-sales--activation)
12. [E-commerce & Orders](#12-e-commerce--orders)
13. [Reminder Engine](#13-reminder-engine)
14. [Digital eTag Generation](#14-digital-etag-generation)
15. [Admin Panel](#15-admin-panel)
16. [Frontend Architecture](#16-frontend-architecture)
17. [Salesperson PWA](#17-salesperson-pwa)
18. [Third-party Integrations](#18-third-party-integrations)
19. [Security & Privacy](#19-security--privacy)
20. [Testing Strategy](#20-testing-strategy)
21. [Deployment & DevOps](#21-deployment--devops)
22. [MVP Phasing & Roadmap](#22-mvp-phasing--roadmap)
23. [Cost Estimation](#23-cost-estimation)
24. [API Reference](#24-api-reference)
25. [Risks & Mitigations](#25-risks--mitigations)

---

## 1. Executive Summary

### 1.1 What we're building

A **privacy-first vehicle contact platform** anchored by a physical QR/NFC tag. When anyone scans the tag, they land on a public page and can call, SMS, or WhatsApp the owner **through a masked/virtual number** — the owner's real number is never exposed.

Three parallel acquisition channels feed a single activation flow:

- **Field sales** — salespeople carry pre-printed tags, sell in person (cash or payment link)
- **Online physical** — customer buys on the website, tag is shipped
- **Online digital eTag** — customer pays, instant PDF with QR is generated

### 1.2 Why this stack

**JavaScript + React + Express + Postgres** gives us:

- **One language everywhere.** Frontend React (JSX), backend Express, worker processes, scripts — all JavaScript ESM. No build step for the backend.
- **Boring, proven infrastructure.** Postgres for money and inventory. Redis for cache and queue. Node.js for I/O-heavy webhook handling.
- **Small footprint.** Same monorepo hosts all backend services and all frontend apps. One CI/CD pipeline.
- **Prisma still gives autocomplete.** Even without adopting TypeScript, Prisma's generated client ships with type definitions that VS Code picks up. You get IntelliSense on all DB models automatically.

### 1.3 The three architectural rules

1. **Every tag is a row in one table.** Its state (`available` / `allocated` / `sold` / `active`) determines what happens on scan. All three sales channels feed the same lifecycle.
2. **Payment is decoupled from activation.** Salesperson can collect cash Monday, customer activates Wednesday. Activation checks `paidAt IS NOT NULL`.
3. **Commission triggers on activation + 7-day hold**, never on sale. Prevents 90% of fraud.

---

## 2. Product Anatomy

### 2.1 Physical tag specification

- **Material:** Weatherproof vinyl sticker (outdoor UV/water resistant) or PVC card for NFC business card variant
- **Print:** QR code (encoding short URL) + optional NFC chip (NTAG213/215)
- **Adhesive:** 3M automotive-grade
- **Code format:** 6-char Crockford base32 (excludes 0/O/1/I/L/U) → ~1 billion codes
- **URL encoded:** `https://spk.example.com/t/AB12CD` (short domain, HTTPS mandatory for iOS NFC)

### 2.2 Product SKUs

| SKU | Priority | Notes |
|---|---|---|
| Car & Bike Tag | **P0** | Primary revenue driver |
| Free eTag (digital PDF) | **P0** | Zero-cost acquisition |
| NFC Business Card | P1 | Higher margin |
| Video Door Tag | P2 | Requires camera flow |

### 2.3 Scanner journey (public, no auth)

1. Any camera scans QR → opens URL in browser
2. Server resolves tag code → renders contact card (or activation page if unactivated)
3. Card shows: vehicle photo (optional), registration plate, three action buttons — **Call**, **SMS**, **WhatsApp**
4. Tap Call → backend allocates Exotel virtual number → scanner dials it → Exotel bridges to owner
5. Every scan is logged (timestamp, coarse geolocation, device)

### 2.4 Owner journey

1. Buys tag online or via salesperson
2. Receives tag physically (or PDF for eTag)
3. Scans own tag → activation page → OTP → vehicle details → payment (if not already paid)
4. Ongoing: receives masked calls/SMS/WhatsApp, gets scan notifications, gets renewal reminders (PUC, insurance, FasTag)

---

## 3. Tech Stack

### 3.1 Complete stack table

| Layer | Choice | Why |
|---|---|---|
| **Language** | JavaScript (ESM) | Node 20+ native ESM; no build step for backend |
| **Frontend (public)** | Next.js 15 App Router | SSR needed for scan page (<1s FCP) + SEO for marketing |
| **Frontend (internal)** | React 19 + Vite | SPAs behind auth don't need SSR; simpler build |
| **UI kit** | Tailwind + shadcn/ui | Rapid, consistent |
| **Client state** | Zustand + TanStack Query | Simple; server state via Query |
| **Client forms** | react-hook-form + Zod | Same schemas as backend |
| **Backend** | Express 4 | Simple, proven, huge ecosystem |
| **ORM** | Prisma 5 | Type-safe queries via JSDoc even in plain JS, migrations, auto-generated client |
| **Database** | PostgreSQL 16 | Right for the money + inventory workload |
| **Cache / Queue** | Redis 7 | Session store, rate limits, BullMQ broker |
| **Job queue** | BullMQ | Redis-backed, retries, delays, cron, mature |
| **Auth** | JWT (access + refresh) + Redis session store | Passwordless via OTP |
| **Validation** | Zod | Runtime schemas — works identically in JS |
| **HTTP client** | Axios | Or native fetch — either works |
| **Testing** | Vitest + Supertest + Playwright | Unit, integration, E2E |
| **PDF gen** | Puppeteer + Chromium | HTML template → PDF |
| **QR gen** | `qrcode` npm package | Battle-tested |
| **Image processing** | `sharp` | Native C++, fast |
| **File storage** | Cloudflare R2 or AWS S3 | R2 has zero egress — big deal for scan-page images |
| **Object upload** | Multer + Sharp + AWS SDK v3 | Standard |
| **Real-time (optional)** | Socket.io | Scan notifications to owner in real-time |
| **Emails (transactional)** | Resend or AWS SES | Simple API, deliverability |
| **Error tracking** | Sentry | Both client and server SDKs |
| **Observability** | OpenTelemetry + Grafana + Loki | Optional at MVP, essential at scale |
| **Monorepo tooling** | pnpm workspaces + Turborepo | Fast, cached builds |

### 3.2 Node.js configuration for pure ESM

Every backend `package.json` sets `"type": "module"`, and code uses `import`/`export` syntax throughout. No CommonJS, no transpilation, no build step. Just `node src/index.js` runs the API.

### 3.3 IDE type hints without TypeScript

Two lightweight tricks give you excellent autocomplete and error detection without adopting TypeScript:

**Option 1: Prisma's generated types.** Prisma's client ships with `.d.ts` files that VS Code and Cursor read automatically. You get autocomplete on every model, field, and relation. Zero effort — it just works.

**Option 2 (optional): `// @ts-check` in JS files.** Add this comment at the top of any file and VS Code will type-check it using JSDoc annotations. Free IDE-only checks; no build step. Recommend adding it to critical files (billing, activation, commission) so misspellings surface in the editor.

```javascript
// @ts-check
/** @typedef {import('@prisma/client').Tag} Tag */

/**
 * @param {Tag} tag
 * @returns {boolean}
 */
export function isTagReady(tag) {
  return tag.status === 'ACTIVE' && tag.paidAt !== null;
}
```

Optional but recommended for money-touching code.

---

## 4. Monorepo Structure

Single pnpm workspace, Turborepo for build caching.

```
sampark/
├── apps/
│   ├── api/                    # Main Express API (auth, tags, users, orders, sales)
│   ├── comm-worker/            # BullMQ worker for Exotel/WhatsApp/SMS
│   ├── scheduler/              # Cron worker (reminders, cleanup)
│   ├── web-marketing/          # Next.js (marketing + public scan page)
│   ├── web-dashboard/          # Vite React (owner dashboard)
│   ├── web-admin/              # Vite React (internal admin panel)
│   └── web-sales/              # Vite React PWA (salesperson app)
├── packages/
│   ├── db/                     # Prisma schema + generated client
│   ├── shared/                 # Zod schemas, constants shared across apps
│   ├── ui/                     # shadcn/ui components shared across React apps
│   ├── config/                 # ESLint, Prettier configs
│   └── comm-clients/           # Wrappers for Exotel, WhatsApp, Razorpay, Shiprocket
├── infra/
│   ├── docker/                 # Dockerfiles per service
│   ├── docker-compose.yml      # Local dev
│   └── k8s/                    # (later) k3s manifests
├── scripts/                    # Batch tag generation, seeders
├── .github/workflows/          # CI/CD pipelines
├── package.json                # workspace root
├── pnpm-workspace.yaml
└── turbo.json
```

### 4.1 Why this shape

- **`apps/api` starts as a monolith.** Every route lives here for the first 6–12 months. Splitting into microservices is deferred until you actually feel pain.
- **`comm-worker` is separate from Day 1.** Reason: telephony webhooks and message sends must not compete with user-facing API traffic for event-loop time. A separate process eliminates head-of-line blocking.
- **`scheduler` is a separate tiny process.** Runs BullMQ scheduled jobs (daily reminder dispatch, weekly commission payouts, cleanup crons). Keeps cron logic isolated.
- **`packages/db` is the single source of truth for the schema.** Every app imports the Prisma client from here.
- **`packages/shared` holds Zod schemas.** The same `CreateVehicleSchema` validates the request body on the API and the form on the client.
- **`packages/comm-clients` isolates third-party SDKs.** Swap Exotel for Twilio by changing one file when you expand internationally.

### 4.2 Root `package.json`

```json
{
  "name": "sampark",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@9",
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "db:migrate": "pnpm --filter @sampark/db migrate:dev",
    "db:studio": "pnpm --filter @sampark/db studio"
  },
  "devDependencies": {
    "turbo": "^2.0.0"
  }
}
```

### 4.3 `apps/api/package.json`

```json
{
  "name": "@sampark/api",
  "type": "module",
  "version": "0.1.0",
  "scripts": {
    "dev": "node --watch src/index.js",
    "start": "node src/index.js",
    "test": "vitest run"
  },
  "dependencies": {
    "@prisma/client": "^5.20.0",
    "@sampark/db": "workspace:*",
    "@sampark/shared": "workspace:*",
    "@sampark/comm-clients": "workspace:*",
    "axios": "^1.7.0",
    "bcrypt": "^5.1.1",
    "bullmq": "^5.10.0",
    "cookie-parser": "^1.4.6",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.0",
    "express-async-errors": "^3.1.1",
    "helmet": "^7.1.0",
    "ioredis": "^5.4.0",
    "jsonwebtoken": "^9.0.2",
    "multer": "^1.4.5-lts.1",
    "pino": "^9.3.0",
    "pino-http": "^10.2.0",
    "rate-limiter-flexible": "^5.0.0",
    "razorpay": "^2.9.4",
    "zod": "^3.23.0"
  }
}
```

Note `"type": "module"` — enables native ESM. `node --watch` provides hot-reload with no extra tooling in dev.

---

## 5. System Architecture

### 5.1 High-level diagram

```
                    ┌──────────────────────────────────────┐
                    │           Cloudflare CDN             │
                    └────────────┬─────────────────────────┘
                                 │
        ┌────────────────────────┼─────────────────────────┐
        │                        │                         │
┌───────▼────────┐    ┌──────────▼────────────┐    ┌───────▼────────┐
│  Next.js       │    │  Vite React SPAs      │    │  React Native  │
│  (marketing +  │    │  (dashboard, admin,   │    │  (later, Ph.2) │
│   scan page)   │    │   sales)              │    │                │
│  SSR + edge    │    │  Static hosted        │    │                │
└───────┬────────┘    └──────────┬────────────┘    └───────┬────────┘
        │                        │                         │
        └────────────────────────┼─────────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │      Load Balancer       │
                    │       (ALB / Caddy)      │
                    └────────────┬────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
      ┌───────▼───────┐  ┌───────▼───────┐  ┌───────▼───────┐
      │  Express API  │  │  Comm-Worker  │  │  Scheduler    │
      │  (main app)   │  │  (BullMQ)     │  │  (BullMQ cron)│
      │  Node 20 ESM  │  │  Node 20 ESM  │  │  Node 20 ESM  │
      └───────┬───────┘  └───────┬───────┘  └───────┬───────┘
              │                  │                  │
              └──────────────────┼──────────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
      ┌───────▼──────┐    ┌──────▼──────┐    ┌──────▼──────┐
      │  PostgreSQL  │    │    Redis    │    │  R2 / S3    │
      │  (Prisma)    │    │  (cache +   │    │  (files)    │
      │              │    │   BullMQ)   │    │             │
      └──────────────┘    └─────────────┘    └─────────────┘
```

### 5.2 Data flow — a scan-to-call

```
Scanner phone      Next.js Edge      Express API      BullMQ / comm-worker      Exotel
     │                  │                 │                    │                    │
     │─ GET /t/AB12CD ─►│                 │                    │                    │
     │                  │─ GET tag ──────►│                    │                    │
     │                  │◄─ payload ──────│                    │                    │
     │◄─ SSR HTML ──────│                 │                    │                    │
     │                  │                 │                    │                    │
     │─ POST /scan-log ────────────────► │────── enqueue ────►│                    │
     │◄─ 200 ────────────────────────────│                    │                    │
     │                                    │                    │                    │
     │─ POST /call/init ────────────────► │──── enqueue ──────►│                    │
     │◄─ session id ─────────────────────│                    │───── connect ─────►│
     │                                    │                    │◄── virtual # ──────│
     │                                    │                    │─ update session ──►│
     │  (poll or SSE)                     │                    │                    │
     │─ GET /call/status ─────────────── ►│                    │                    │
     │◄─ {virtual_number} ───────────────│                    │                    │
     │                                    │                    │                    │
     │─── dials virtual # ────────────────────────────────────────────────────────►│
     │                                    │                    │◄── bridges call ───│
```

**Why the queue-first pattern:** The API responds to the scanner within milliseconds (session created in DB), while the actual Exotel call setup happens in the worker. The scanner briefly polls or receives an SSE update once the virtual number is ready. This decouples user-facing latency from Exotel's response time.

---

## 6. Database Schema (Prisma)

Complete schema. Living in `packages/db/prisma/schema.prisma`. Prisma's schema DSL is identical regardless of whether your app code is JS or TS — the schema file itself is not JavaScript.

```prisma
// packages/db/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================================
// USERS & AUTH
// ============================================================

enum UserRole {
  CUSTOMER
  SALESPERSON
  RESELLER
  ADMIN
  SUPERADMIN
}

model User {
  id                Int       @id @default(autoincrement())
  phone             String    @unique
  phoneVerifiedAt   DateTime?
  email             String?   @unique
  emailVerifiedAt   DateTime?
  name              String?
  countryCode       String    @default("IN") @db.VarChar(2)
  language          String    @default("en") @db.VarChar(5)
  pushToken         String?
  role              UserRole  @default(CUSTOMER)
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  vehicles          Vehicle[]
  emergencyContacts EmergencyContact[]
  tags              Tag[]           @relation("tag_owner")
  documents         Document[]
  reminders         Reminder[]
  orders            Order[]
  salesperson       Salesperson?
  reseller          Reseller?
  refreshTokens     RefreshToken[]

  @@index([phone])
  @@map("users")
}

model Otp {
  id          Int       @id @default(autoincrement())
  phone       String
  codeHash    String
  purpose     String
  attempts    Int       @default(0)
  expiresAt   DateTime
  consumedAt  DateTime?
  createdAt   DateTime  @default(now())

  @@index([phone, purpose])
  @@map("otps")
}

model RefreshToken {
  id          Int       @id @default(autoincrement())
  userId      Int
  tokenHash   String    @unique
  device      String?
  expiresAt   DateTime
  revokedAt   DateTime?
  createdAt   DateTime  @default(now())

  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("refresh_tokens")
}

// ============================================================
// VEHICLES
// ============================================================

enum VehicleType {
  CAR
  BIKE
  TRUCK
  OTHER
}

model Vehicle {
  id                    Int         @id @default(autoincrement())
  userId                Int
  registrationNumber    String?
  make                  String?
  model                 String?
  vehicleType           VehicleType @default(CAR)
  color                 String?
  yearOfPurchase        Int?
  photoUrl              String?
  fastagNumber          String?
  fastagExpiresAt       DateTime?   @db.Date
  pucExpiresAt          DateTime?   @db.Date
  insuranceExpiresAt    DateTime?   @db.Date
  rcExpiresAt           DateTime?   @db.Date
  createdAt             DateTime    @default(now())
  updatedAt             DateTime    @updatedAt

  user                  User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  tags                  Tag[]
  documents             Document[]
  reminders             Reminder[]

  @@index([userId])
  @@index([registrationNumber])
  @@map("vehicles")
}

model EmergencyContact {
  id         Int      @id @default(autoincrement())
  userId     Int
  name       String
  phone      String
  relation   String?
  isPrimary  Boolean  @default(false)
  createdAt  DateTime @default(now())

  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("emergency_contacts")
}

// ============================================================
// TAGS
// ============================================================

enum TagType {
  VEHICLE
  BUSINESS_CARD
  DOOR
  LUGGAGE
  ETAG
}

enum TagStatus {
  AVAILABLE
  ALLOCATED_TO_SALESPERSON
  SOLD_PENDING_ACTIVATION
  ACTIVE
  DISABLED
  LOST
  EXPIRED
}

enum ActivationChannel {
  FIELD
  ONLINE_PHYSICAL
  ONLINE_ETAG
}

enum PaymentMethod {
  CASH
  RAZORPAY_LINK
  RAZORPAY_CHECKOUT
  FREE
}

model TagBatch {
  id              Int      @id @default(autoincrement())
  batchNumber     String   @unique
  quantity        Int
  tagType         TagType
  manufacturedAt  DateTime?
  notes           String?
  createdAt       DateTime @default(now())

  tags            Tag[]
  allocations     TagAllocation[]

  @@map("tag_batches")
}

model Tag {
  id                          Int                @id @default(autoincrement())
  code                        String             @unique
  tagType                     TagType            @default(VEHICLE)
  batchId                     Int?
  status                      TagStatus          @default(AVAILABLE)
  activatedAt                 DateTime?
  userId                      Int?
  vehicleId                   Int?
  orderId                     Int?
  displayName                 String?
  scanCount                   Int                @default(0)
  lastScannedAt               DateTime?
  allocatedToSalespersonId    Int?
  soldBySalespersonId         Int?
  soldAt                      DateTime?
  soldToPhone                 String?
  paidAt                      DateTime?
  paidAmountPaise             Int?
  paymentMethod               PaymentMethod?
  activationChannel           ActivationChannel?
  activationExpiresAt         DateTime?
  commissionPaid              Boolean            @default(false)
  createdAt                   DateTime           @default(now())
  updatedAt                   DateTime           @updatedAt

  batch                       TagBatch?          @relation(fields: [batchId], references: [id])
  user                        User?              @relation("tag_owner", fields: [userId], references: [id])
  vehicle                     Vehicle?           @relation(fields: [vehicleId], references: [id])
  order                       Order?             @relation(fields: [orderId], references: [id])
  allocatedToSalesperson      Salesperson?       @relation("allocated_tags", fields: [allocatedToSalespersonId], references: [id])
  soldBySalesperson           Salesperson?       @relation("sold_tags", fields: [soldBySalespersonId], references: [id])
  scans                       Scan[]
  commSessions                CommSession[]
  commission                  Commission?
  paymentLink                 PaymentLink?

  @@index([code])
  @@index([status])
  @@index([allocatedToSalespersonId])
  @@index([soldToPhone])
  @@map("tags")
}

model Scan {
  id           BigInt   @id @default(autoincrement())
  tagId        Int
  ipAddress    String?
  country      String?  @db.VarChar(2)
  city         String?
  lat          Decimal? @db.Decimal(9, 6)
  lng          Decimal? @db.Decimal(9, 6)
  userAgent    String?
  deviceType   String?
  referer      String?
  sessionId    String?  @db.Uuid
  actionTaken  String?
  createdAt    DateTime @default(now())

  tag          Tag      @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@index([tagId, createdAt(sort: Desc)])
  @@map("scans")
}

// ============================================================
// SALESPERSONS
// ============================================================

enum SalespersonStatus {
  ACTIVE
  SUSPENDED
  TERMINATED
}

model Salesperson {
  id                   Int                @id @default(autoincrement())
  userId               Int                @unique
  employeeCode         String             @unique
  name                 String
  phone                String
  email                String?
  resellerId           Int?
  state                String?
  city                 String?
  referralCode         String             @unique
  commissionPct        Decimal            @default(20.00) @db.Decimal(5, 2)
  walletBalancePaise   Int                @default(0)
  tagsAllocated        Int                @default(0)
  tagsSold             Int                @default(0)
  tagsActivated        Int                @default(0)
  status               SalespersonStatus  @default(ACTIVE)
  kycVerifiedAt        DateTime?
  bankDetailsEncrypted String?
  hiredAt              DateTime?
  createdAt            DateTime           @default(now())

  user                 User               @relation(fields: [userId], references: [id])
  reseller             Reseller?          @relation(fields: [resellerId], references: [id])
  allocatedTags        Tag[]              @relation("allocated_tags")
  soldTags             Tag[]              @relation("sold_tags")
  allocations          TagAllocation[]
  paymentLinks         PaymentLink[]
  commissions          Commission[]

  @@index([resellerId])
  @@index([referralCode])
  @@map("salespersons")
}

model TagAllocation {
  id             Int      @id @default(autoincrement())
  salespersonId  Int
  batchId        Int?
  tagIds         Int[]
  quantity       Int
  status         String   @default("active")
  allocatedAt    DateTime @default(now())
  allocatedBy    Int
  notes          String?

  salesperson    Salesperson @relation(fields: [salespersonId], references: [id])
  batch          TagBatch?   @relation(fields: [batchId], references: [id])

  @@index([salespersonId])
  @@map("tag_allocations")
}

// ============================================================
// RESELLERS
// ============================================================

model Reseller {
  id                   Int      @id @default(autoincrement())
  userId               Int      @unique
  businessName         String
  gstin                String?
  tier                 String   @default("silver")
  commissionPct        Decimal  @default(15.00) @db.Decimal(5, 2)
  walletBalancePaise   Int      @default(0)
  totalSalesPaise      BigInt   @default(0)
  referralCode         String   @unique
  state                String?
  city                 String?
  approvedAt           DateTime?
  createdAt            DateTime @default(now())

  user                 User          @relation(fields: [userId], references: [id])
  salespersons         Salesperson[]
  walletTxns           ResellerWalletTxn[]
  commissions          Commission[]
  orders               Order[]

  @@map("resellers")
}

model ResellerWalletTxn {
  id            Int      @id @default(autoincrement())
  resellerId    Int
  orderId       Int?
  type          String
  amountPaise   Int
  balanceAfter  Int
  reference     String?
  notes         String?
  createdAt     DateTime @default(now())

  reseller      Reseller @relation(fields: [resellerId], references: [id])
  order         Order?   @relation(fields: [orderId], references: [id])

  @@map("reseller_wallet_txns")
}

// ============================================================
// COMMISSIONS
// ============================================================

enum CommissionStatus {
  PENDING
  CREDITED
  REVERSED
  PAID_OUT
}

model Commission {
  id                        Int              @id @default(autoincrement())
  tagId                     Int              @unique
  salespersonId             Int
  resellerId                Int?
  orderAmountPaise          Int
  spCommissionPaise         Int              @default(0)
  resellerCommissionPaise   Int              @default(0)
  status                    CommissionStatus @default(PENDING)
  triggerReason             String?
  triggeredAt               DateTime         @default(now())
  creditedAt                DateTime?
  reversedAt                DateTime?
  notes                     String?

  tag                       Tag              @relation(fields: [tagId], references: [id])
  salesperson               Salesperson      @relation(fields: [salespersonId], references: [id])
  reseller                  Reseller?        @relation(fields: [resellerId], references: [id])

  @@index([salespersonId, status])
  @@map("commissions")
}

// ============================================================
// PAYMENT LINKS
// ============================================================

model PaymentLink {
  id                  Int      @id @default(autoincrement())
  tagId               Int      @unique
  generatedBySpId     Int
  customerPhone       String
  amountPaise         Int
  razorpayLinkId      String   @unique
  razorpayShortUrl    String
  status              String   @default("created")
  expiresAt           DateTime
  paidAt              DateTime?
  createdAt           DateTime @default(now())

  tag                 Tag         @relation(fields: [tagId], references: [id])
  salesperson         Salesperson @relation(fields: [generatedBySpId], references: [id])

  @@map("payment_links")
}

// ============================================================
// COMMUNICATION SESSIONS
// ============================================================

model CommSession {
  id                Int       @id @default(autoincrement())
  tagId             Int
  scanId            BigInt?
  channel           String
  callerPhone       String?
  ownerPhone        String
  virtualNumber     String?
  provider          String    @default("exotel")
  providerCallId    String?   @unique
  status            String?
  durationSeconds   Int?
  recordingUrl      String?
  costPaise         Int?
  expiresAt         DateTime?
  createdAt         DateTime  @default(now())
  completedAt       DateTime?

  tag               Tag       @relation(fields: [tagId], references: [id])

  @@index([tagId, createdAt(sort: Desc)])
  @@index([providerCallId])
  @@map("comm_sessions")
}

// ============================================================
// DOCUMENTS
// ============================================================

model Document {
  id            Int       @id @default(autoincrement())
  userId        Int
  vehicleId     Int?
  docType       String
  fileUrl       String
  fileSize      Int?
  mimeType      String?
  expiresAt     DateTime? @db.Date
  ocrExtracted  Json?
  verifiedAt    DateTime?
  createdAt     DateTime  @default(now())

  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  vehicle       Vehicle?  @relation(fields: [vehicleId], references: [id], onDelete: Cascade)

  @@index([userId, vehicleId])
  @@map("documents")
}

// ============================================================
// REMINDERS
// ============================================================

model Reminder {
  id            Int       @id @default(autoincrement())
  userId        Int
  vehicleId     Int
  reminderType  String
  dueDate       DateTime  @db.Date
  channels      String    @default("sms,whatsapp")
  sent30d       Boolean   @default(false)
  sent7d        Boolean   @default(false)
  sent1d        Boolean   @default(false)
  createdAt     DateTime  @default(now())

  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  vehicle       Vehicle   @relation(fields: [vehicleId], references: [id], onDelete: Cascade)

  @@index([dueDate])
  @@map("reminders")
}

// ============================================================
// PRODUCTS & ORDERS
// ============================================================

enum OrderStatus {
  PENDING
  PAID
  PACKED
  SHIPPED
  DELIVERED
  CANCELLED
  REFUNDED
  RTO
}

model Product {
  id            Int      @id @default(autoincrement())
  slug          String   @unique
  name          String
  description   String?
  tagType       TagType?
  pricePaise    Int
  priceMap      Json?
  stock         Int      @default(0)
  images        Json?
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())

  orderItems    OrderItem[]

  @@map("products")
}

model Order {
  id                    Int         @id @default(autoincrement())
  orderNumber           String      @unique
  userId                Int
  resellerId            Int?
  status                OrderStatus @default(PENDING)
  paymentMethod         String?
  paymentStatus         String      @default("pending")
  razorpayOrderId       String?
  razorpayPaymentId     String?
  subtotalPaise         Int
  shippingPaise         Int         @default(0)
  taxPaise              Int         @default(0)
  discountPaise         Int         @default(0)
  totalPaise            Int
  currency              String      @default("INR") @db.VarChar(3)
  shippingAddress       Json
  shiprocketId          String?
  awbNumber             String?
  trackingUrl           String?
  createdAt             DateTime    @default(now())
  shippedAt             DateTime?
  deliveredAt           DateTime?

  user                  User        @relation(fields: [userId], references: [id])
  reseller              Reseller?   @relation(fields: [resellerId], references: [id])
  items                 OrderItem[]
  tags                  Tag[]
  resellerWalletTxns    ResellerWalletTxn[]

  @@index([userId])
  @@index([status])
  @@map("orders")
}

model OrderItem {
  id              Int      @id @default(autoincrement())
  orderId         Int
  productId       Int
  quantity        Int      @default(1)
  unitPricePaise  Int
  totalPaise      Int

  order           Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  product         Product  @relation(fields: [productId], references: [id])

  @@map("order_items")
}
```

### 6.1 Migrations

```bash
# Development
pnpm --filter @sampark/db migrate:dev --name init

# Production
pnpm --filter @sampark/db migrate:deploy
```

Prisma tracks migration history in a `_prisma_migrations` table. Don't hand-edit generated SQL — modify the schema and regenerate.

### 6.2 Prisma client — the shared package

```javascript
// packages/db/src/index.js
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

The global cache trick prevents `nodemon`/`--watch` from spawning new Prisma clients on every reload and exhausting the connection pool.

### 6.3 Seeding

```javascript
// packages/db/seed.js
import { PrismaClient } from '@prisma/client';
import { generateTagCode } from './src/utils.js';

const prisma = new PrismaClient();

async function main() {
  await prisma.product.upsert({
    where: { slug: 'car-bike-tag' },
    update: {},
    create: {
      slug: 'car-bike-tag',
      name: 'Car & Bike Sampark Tag',
      description: 'Privacy-first vehicle contact tag',
      tagType: 'VEHICLE',
      pricePaise: 39900,
      stock: 10000,
      images: [],
    },
  });

  const batch = await prisma.tagBatch.create({
    data: {
      batchNumber: 'B-2026-001',
      quantity: 1000,
      tagType: 'VEHICLE',
    },
  });

  const codes = new Set();
  while (codes.size < 1000) {
    codes.add(generateTagCode());
  }

  await prisma.tag.createMany({
    data: [...codes].map((code) => ({
      code,
      tagType: 'VEHICLE',
      batchId: batch.id,
    })),
  });

  console.log('Seeded 1000 tags');
}

main().finally(() => prisma.$disconnect());
```

---

## 7. Authentication System (OTP + JWT)

### 7.1 Design

- **Passwordless.** Phone number + OTP. No passwords ever.
- **JWT access token** — 15-minute TTL, stateless verification via signature.
- **Refresh token** — 30-day TTL, stored hashed in Postgres, revocable.
- **Access token in memory** on client (React), refresh token in `httpOnly` secure cookie.

### 7.2 OTP flow

```javascript
// apps/api/src/routes/auth.js
import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { prisma } from '@sampark/db';
import { sendSms } from '@sampark/comm-clients/sms';
import { issueTokens } from '../lib/tokens.js';
import { rateLimit } from '../middleware/rate-limit.js';

const router = Router();

const RequestOtpSchema = z.object({
  phone: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Must be E.164 format'),
  purpose: z.enum(['login', 'activation']).default('login'),
});

router.post(
  '/request-otp',
  rateLimit({ points: 3, duration: 900, keyPrefix: 'otp_req' }),
  async (req, res) => {
    const parsed = RequestOtpSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }
    const { phone, purpose } = parsed.data;

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = await bcrypt.hash(code, 10);

    await prisma.otp.create({
      data: {
        phone,
        codeHash,
        purpose,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    await sendSms({
      to: phone,
      body: `Your Sampark code is ${code}. Valid for 10 min.`,
    });

    res.json({ ok: true });
  },
);

const VerifyOtpSchema = z.object({
  phone: z.string(),
  code: z.string().length(6).regex(/^\d+$/),
});

router.post('/verify-otp', async (req, res) => {
  const parsed = VerifyOtpSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const { phone, code } = parsed.data;

  const otp = await prisma.otp.findFirst({
    where: {
      phone,
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!otp || !(await bcrypt.compare(code, otp.codeHash))) {
    if (otp) {
      await prisma.otp.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });
    }
    return res.status(401).json({ error: 'Invalid code' });
  }

  await prisma.otp.update({
    where: { id: otp.id },
    data: { consumedAt: new Date() },
  });

  const user = await prisma.user.upsert({
    where: { phone },
    update: { phoneVerifiedAt: new Date() },
    create: {
      phone,
      phoneVerifiedAt: new Date(),
    },
  });

  const { accessToken, refreshToken } = await issueTokens(user.id, req);

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  res.json({
    accessToken,
    user: {
      id: user.id,
      phone: user.phone,
      name: user.name,
      role: user.role,
    },
  });
});

export default router;
```

### 7.3 Token issuance

```javascript
// apps/api/src/lib/tokens.js
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { prisma } from '@sampark/db';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const REFRESH_TTL_DAYS = 30;

export async function issueTokens(userId, req) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { id: true, phone: true, role: true },
  });

  const accessToken = jwt.sign(
    { sub: user.id, phone: user.phone, role: user.role },
    ACCESS_SECRET,
    { expiresIn: '15m' },
  );

  const refreshToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash,
      device: req.headers['user-agent']?.slice(0, 100),
      expiresAt: new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000),
    },
  });

  return { accessToken, refreshToken };
}

export async function verifyRefreshToken(refreshToken) {
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const record = await prisma.refreshToken.findUnique({
    where: { tokenHash },
  });
  if (!record || record.revokedAt || record.expiresAt < new Date()) {
    return null;
  }
  return record.userId;
}
```

### 7.4 Auth middleware

```javascript
// apps/api/src/middleware/auth.js
import jwt from 'jsonwebtoken';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' });
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, ACCESS_SECRET);
    req.user = {
      id: payload.sub,
      phone: payload.phone,
      role: payload.role,
    };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}
```

---

## 8. Core Flow — Scan to Contact

### 8.1 Public tag lookup

```javascript
// apps/api/src/routes/tags-public.js
import { Router } from 'express';
import { prisma } from '@sampark/db';
import { commQueue } from '../queues/comm.js';

const router = Router();

router.get('/tags/:code/public', async (req, res) => {
  const tag = await prisma.tag.findUnique({
    where: { code: req.params.code },
    include: {
      vehicle: {
        select: {
          registrationNumber: true,
          make: true,
          model: true,
          photoUrl: true,
        },
      },
    },
  });

  if (!tag) return res.status(404).json({ error: 'Tag not found' });

  const base = {
    code: tag.code,
    status: tag.status,
    displayName: tag.displayName,
  };

  switch (tag.status) {
    case 'ACTIVE':
      return res.json({
        ...base,
        vehicle: tag.vehicle,
        actions: ['call', 'sms', 'whatsapp'],
      });
    case 'SOLD_PENDING_ACTIVATION':
      return res.json({
        ...base,
        needsActivation: true,
        prefillPhone: tag.soldToPhone ? '***' + tag.soldToPhone.slice(-4) : null,
        needsPayment: !tag.paidAt,
      });
    case 'DISABLED':
    case 'LOST':
      return res.json({ ...base, message: 'This tag is currently inactive.' });
    default:
      return res.status(404).json({ error: 'Tag not available' });
  }
});

router.post('/tags/:code/scan-log', async (req, res) => {
  const tag = await prisma.tag.findUnique({ where: { code: req.params.code } });
  if (!tag) return res.status(404).end();

  await commQueue.add('log-scan', {
    tagId: tag.id,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    referer: req.headers.referer,
    actionTaken: req.body.action ?? 'view_only',
  });

  res.status(202).end();
});

export default router;
```

### 8.2 The public scan page (Next.js)

```jsx
// apps/web-marketing/app/t/[code]/page.jsx
import { notFound } from 'next/navigation';
import { ContactCard } from '@/components/ContactCard';
import { ActivationFlow } from '@/components/ActivationFlow';
import { TagInactive } from '@/components/TagInactive';

export const revalidate = 30;

async function getTag(code) {
  const res = await fetch(`${process.env.API_URL}/tags/${code}/public`, {
    next: { revalidate: 30, tags: [`tag-${code}`] },
  });
  if (!res.ok) return null;
  return res.json();
}

export default async function TagPage({ params }) {
  const { code } = await params;
  const tag = await getTag(code);
  if (!tag) notFound();

  switch (tag.status) {
    case 'ACTIVE':
      return <ContactCard tag={tag} />;
    case 'SOLD_PENDING_ACTIVATION':
      return <ActivationFlow tag={tag} />;
    default:
      return <TagInactive tag={tag} />;
  }
}
```

### 8.3 Scan log worker

```javascript
// apps/comm-worker/src/workers/scan.js
import { Worker } from 'bullmq';
import geoip from 'geoip-lite';
import { prisma } from '@sampark/db';
import { redisConnection } from '../lib/redis.js';

new Worker(
  'comm',
  async (job) => {
    if (job.name !== 'log-scan') return;

    const { tagId, ip, userAgent, referer, actionTaken } = job.data;

    const geo = ip ? geoip.lookup(ip) : null;
    const deviceType = /mobile|android|iphone/i.test(userAgent ?? '') ? 'mobile' : 'desktop';

    await prisma.$transaction([
      prisma.scan.create({
        data: {
          tagId,
          ipAddress: ip,
          country: geo?.country ?? null,
          city: geo?.city ?? null,
          userAgent: userAgent?.slice(0, 500),
          deviceType,
          referer,
          actionTaken,
        },
      }),
      prisma.tag.update({
        where: { id: tagId },
        data: {
          scanCount: { increment: 1 },
          lastScannedAt: new Date(),
        },
      }),
    ]);
  },
  { connection: redisConnection, concurrency: 10 },
);
```

---

## 9. Core Flow — Masked Calling (Exotel)

### 9.1 Exotel client wrapper

```javascript
// packages/comm-clients/src/exotel.js
import axios from 'axios';

export class ExotelClient {
  constructor(config) {
    this.config = config;
    this.http = axios.create({
      baseURL: `https://${config.apiKey}:${config.apiToken}@${config.subdomain}/v1/Accounts/${config.accountSid}`,
      timeout: 10_000,
    });
  }

  /**
   * Bridge two numbers — Exotel dials both, connects them.
   * Neither party sees the other's real number.
   */
  async connectCall({ from, to, statusCallback }) {
    const form = new URLSearchParams({
      From: from,
      To: to,
      CallerId: this.config.callerId,
      StatusCallback: statusCallback,
      Record: 'false',
    });

    const { data } = await this.http.post('/Calls/connect.json', form.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    return {
      callSid: data.Call.Sid,
      virtualNumber: this.config.callerId,
    };
  }

  async sendSms({ to, body }) {
    const form = new URLSearchParams({
      From: this.config.callerId,
      To: to,
      Body: body,
    });

    const { data } = await this.http.post('/Sms/send.json', form.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    return data.SMSMessage.Sid;
  }

  verifyWebhook(signature, body) {
    // Exotel uses HMAC-SHA1 with the account token
    // See docs.exotel.com for exact implementation
    return true; // TODO implement
  }
}

export const exotelClient = new ExotelClient({
  accountSid: process.env.EXOTEL_SID,
  apiKey: process.env.EXOTEL_KEY,
  apiToken: process.env.EXOTEL_TOKEN,
  subdomain: process.env.EXOTEL_SUBDOMAIN ?? 'api.exotel.com',
  callerId: process.env.EXOTEL_EXOPHONE,
});
```

### 9.2 Call initiation endpoint

```javascript
// apps/api/src/routes/comm.js
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@sampark/db';
import { commQueue } from '../queues/comm.js';
import { rateLimit } from '../middleware/rate-limit.js';

const router = Router();

const InitCallSchema = z.object({
  callerPhone: z.string().regex(/^\+[1-9]\d{1,14}$/),
});

router.post(
  '/tags/:code/call',
  rateLimit({ points: 5, duration: 3600, keyPrefix: 'call' }),
  async (req, res) => {
    const parsed = InitCallSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
    const { callerPhone } = parsed.data;

    const tag = await prisma.tag.findUnique({
      where: { code: req.params.code },
      include: { user: { select: { phone: true } } },
    });

    if (!tag || tag.status !== 'ACTIVE' || !tag.user) {
      return res.status(404).json({ error: 'Tag not available' });
    }

    const session = await prisma.commSession.create({
      data: {
        tagId: tag.id,
        channel: 'call',
        callerPhone,
        ownerPhone: tag.user.phone,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    const job = await commQueue.add(
      'connect-call',
      { sessionId: session.id },
      { attempts: 3, backoff: { type: 'exponential', delay: 1000 } },
    );

    res.json({ sessionId: session.id, jobId: job.id });
  },
);

router.get('/comm-sessions/:id', async (req, res) => {
  const session = await prisma.commSession.findUnique({
    where: { id: parseInt(req.params.id, 10) },
    select: { id: true, status: true, virtualNumber: true, expiresAt: true },
  });
  if (!session) return res.status(404).end();
  res.json(session);
});

export default router;
```

### 9.3 Call bridge worker

```javascript
// apps/comm-worker/src/workers/call.js
import { Worker } from 'bullmq';
import { prisma } from '@sampark/db';
import { exotelClient } from '@sampark/comm-clients/exotel';
import { redisConnection } from '../lib/redis.js';

new Worker(
  'comm',
  async (job) => {
    if (job.name !== 'connect-call') return;

    const { sessionId } = job.data;
    const session = await prisma.commSession.findUniqueOrThrow({
      where: { id: sessionId },
    });

    try {
      const result = await exotelClient.connectCall({
        from: session.callerPhone,
        to: session.ownerPhone,
        statusCallback: `${process.env.PUBLIC_URL}/webhooks/exotel`,
      });

      await prisma.commSession.update({
        where: { id: sessionId },
        data: {
          providerCallId: result.callSid,
          virtualNumber: result.virtualNumber,
          status: 'initiated',
        },
      });
    } catch (err) {
      await prisma.commSession.update({
        where: { id: sessionId },
        data: { status: 'failed' },
      });
      throw err; // BullMQ will retry
    }
  },
  { connection: redisConnection, concurrency: 5 },
);
```

### 9.4 Exotel webhook handler

```javascript
// apps/api/src/routes/webhooks-exotel.js
import { Router } from 'express';
import { prisma } from '@sampark/db';

const router = Router();

router.post('/webhooks/exotel', async (req, res) => {
  // TODO: verify Exotel signature
  const { CallSid, Status, Duration, RecordingUrl } = req.body;

  await prisma.commSession.updateMany({
    where: { providerCallId: CallSid },
    data: {
      status: Status?.toLowerCase(),
      durationSeconds: Duration ? parseInt(Duration, 10) : undefined,
      recordingUrl: RecordingUrl,
      completedAt: Status === 'completed' ? new Date() : undefined,
    },
  });

  res.json({ ok: true });
});

export default router;
```

---

## 10. Core Flow — WhatsApp Routing

WhatsApp Business Cloud API (via Meta directly or a BSP like Gupshup).

```javascript
// packages/comm-clients/src/whatsapp.js
import axios from 'axios';

export class WhatsAppClient {
  constructor(config) {
    this.config = config;
  }

  async sendTemplate({ to, templateName, languageCode = 'en', components = [] }) {
    const { data } = await axios.post(
      `https://graph.facebook.com/v20.0/${this.config.phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: to.replace(/^\+/, ''),
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode },
          components,
        },
      },
      { headers: { Authorization: `Bearer ${this.config.accessToken}` } },
    );

    return data.messages[0].id;
  }

  async sendText({ to, body }) {
    const { data } = await axios.post(
      `https://graph.facebook.com/v20.0/${this.config.phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: to.replace(/^\+/, ''),
        type: 'text',
        text: { body },
      },
      { headers: { Authorization: `Bearer ${this.config.accessToken}` } },
    );

    return data.messages[0].id;
  }
}

export const whatsappClient = new WhatsAppClient({
  phoneNumberId: process.env.WA_PHONE_ID,
  accessToken: process.env.WA_ACCESS_TOKEN,
});
```

The scan-page "WhatsApp" button captures a message via form → API POST → WhatsApp Business message to owner using an approved template like `scan_notification` with the vehicle plate + message text + a reply link.

---

## 11. Multi-Channel Sales & Activation

### 11.1 The unified state machine

```
                ┌──────────────┐
                │  available   │
                └──────┬───────┘
                       │
        ┌──────────────┼──────────────────────────────┐
        │ admin        │ web checkout                 │ eTag checkout
        │ allocates    │ (physical)                   │ (digital)
        ▼              ▼                              ▼
┌───────────────┐ ┌──────────────────────┐ ┌──────────────────┐
│ allocated_    │ │ sold_pending_        │ │  active          │
│ to_           │ │ activation           │ │  (eTag skips     │
│ salesperson   │ │                      │ │   pending step)  │
└───────┬───────┘ └────────┬─────────────┘ └──────────────────┘
        │ salesperson      │
        │ sells            │
        ▼                  ▼
┌────────────────────────────────────┐
│    sold_pending_activation         │
│    (paidAt=NULL or set based on    │
│     cash vs. link vs. checkout)    │
└──────────────┬─────────────────────┘
               │ customer scans + verifies OTP + adds vehicle
               │ (and pays inline if paidAt is null)
               ▼
        ┌──────────────┐
        │   active     │
        └──────────────┘
```

### 11.2 Sales endpoint

```javascript
// apps/api/src/routes/sales.js
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@sampark/db';
import { razorpayClient } from '@sampark/comm-clients/razorpay';
import { commQueue } from '../queues/comm.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

const SellSchema = z.object({
  tagCode: z.string().length(6),
  customerPhone: z.string().regex(/^\+[1-9]\d{1,14}$/),
  paymentMethod: z.enum(['cash', 'link']),
  pricePaise: z.number().int().min(100),
});

router.post(
  '/sales/sell',
  requireAuth,
  requireRole('SALESPERSON'),
  async (req, res) => {
    const parsed = SellSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
    const { tagCode, customerPhone, paymentMethod, pricePaise } = parsed.data;

    const salesperson = await prisma.salesperson.findUnique({
      where: { userId: req.user.id },
    });
    if (!salesperson || salesperson.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'Not an active salesperson' });
    }

    let result;
    try {
      result = await prisma.$transaction(async (tx) => {
        // Lock the tag row
        const tags = await tx.$queryRaw`
          SELECT id FROM tags
          WHERE code = ${tagCode}
            AND allocated_to_salesperson_id = ${salesperson.id}
            AND status = 'ALLOCATED_TO_SALESPERSON'
          FOR UPDATE
        `;
        if (tags.length === 0) {
          throw new Error('Tag not in your inventory');
        }
        const tagId = tags[0].id;

        // No duplicate pending activations for this phone
        const existing = await tx.tag.findFirst({
          where: {
            soldToPhone: customerPhone,
            status: 'SOLD_PENDING_ACTIVATION',
          },
        });
        if (existing) {
          throw new Error('Customer already has a pending activation');
        }

        const updated = await tx.tag.update({
          where: { id: tagId },
          data: {
            status: 'SOLD_PENDING_ACTIVATION',
            soldBySalespersonId: salesperson.id,
            soldAt: new Date(),
            soldToPhone: customerPhone,
            paymentMethod: paymentMethod === 'cash' ? 'CASH' : 'RAZORPAY_LINK',
            paidAt: paymentMethod === 'cash' ? new Date() : null,
            paidAmountPaise: paymentMethod === 'cash' ? pricePaise : null,
            activationChannel: 'FIELD',
            activationExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          },
        });

        await tx.salesperson.update({
          where: { id: salesperson.id },
          data: { tagsSold: { increment: 1 } },
        });

        return updated;
      });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }

    if (paymentMethod === 'cash') {
      await commQueue.add('send-activation-sms', {
        phone: customerPhone,
        tagCode: result.code,
      });
    } else {
      const link = await razorpayClient.paymentLink.create({
        amount: pricePaise,
        currency: 'INR',
        accept_partial: false,
        reference_id: `TAG-${result.code}`,
        description: `Sampark Tag ${result.code}`,
        customer: { contact: customerPhone },
        notify: { sms: true, email: false },
        callback_url: `${process.env.PUBLIC_URL}/rzp/payment-link-callback`,
        callback_method: 'get',
      });

      await prisma.paymentLink.create({
        data: {
          tagId: result.id,
          generatedBySpId: salesperson.id,
          customerPhone,
          amountPaise: pricePaise,
          razorpayLinkId: link.id,
          razorpayShortUrl: link.short_url,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
    }

    res.json({ ok: true, tag: { id: result.id, code: result.code } });
  },
);

export default router;
```

### 11.3 Universal activation endpoint

```javascript
// apps/api/src/routes/activation.js
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@sampark/db';
import { commissionQueue } from '../queues/commission.js';
import { issueTokens } from '../lib/tokens.js';

const router = Router();

const ActivateSchema = z.object({
  phone: z.string().regex(/^\+[1-9]\d{1,14}$/),
  vehicle: z.object({
    registrationNumber: z.string().min(4).max(20),
    make: z.string().optional(),
    model: z.string().optional(),
    photoUrl: z.string().url().optional(),
  }),
  displayName: z.string().max(100).optional(),
});

router.post('/tags/:code/activate', async (req, res) => {
  const parsed = ActivateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const { phone, vehicle, displayName } = parsed.data;

  let result;
  try {
    result = await prisma.$transaction(async (tx) => {
      const tag = await tx.tag.findUnique({ where: { code: req.params.code } });
      if (!tag || tag.status !== 'SOLD_PENDING_ACTIVATION') {
        throw new Error('Tag not available for activation');
      }
      if (!tag.paidAt) {
        throw new Error('Payment pending');
      }

      const user = await tx.user.upsert({
        where: { phone },
        update: { phoneVerifiedAt: new Date() },
        create: { phone, phoneVerifiedAt: new Date() },
      });

      const veh = await tx.vehicle.create({
        data: {
          userId: user.id,
          registrationNumber: vehicle.registrationNumber.toUpperCase(),
          make: vehicle.make,
          model: vehicle.model,
          photoUrl: vehicle.photoUrl,
        },
      });

      const activatedTag = await tx.tag.update({
        where: { id: tag.id },
        data: {
          status: 'ACTIVE',
          userId: user.id,
          vehicleId: veh.id,
          activatedAt: new Date(),
          displayName: displayName ?? user.name ?? null,
        },
      });

      return { user, tag: activatedTag };
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  // Fire commission event with 7-day delay (fraud buffer)
  if (result.tag.soldBySalespersonId) {
    await commissionQueue.add(
      'process-commission',
      { tagId: result.tag.id },
      { delay: 7 * 24 * 60 * 60 * 1000 },
    );
  }

  const { accessToken, refreshToken } = await issueTokens(result.user.id, req);

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  res.json({
    ok: true,
    tag: { code: result.tag.code },
    accessToken,
    user: { id: result.user.id, phone: result.user.phone },
  });
});

export default router;
```

### 11.4 Commission worker

```javascript
// apps/comm-worker/src/workers/commission.js
import { Worker } from 'bullmq';
import { prisma } from '@sampark/db';
import { redisConnection } from '../lib/redis.js';

new Worker(
  'commission',
  async (job) => {
    if (job.name !== 'process-commission') return;
    const { tagId } = job.data;

    await prisma.$transaction(async (tx) => {
      const tag = await tx.tag.findUnique({
        where: { id: tagId },
        include: { soldBySalesperson: { include: { reseller: true } } },
      });

      if (!tag || tag.status !== 'ACTIVE' || tag.commissionPaid) return;
      if (!tag.soldBySalesperson) return;

      const sp = tag.soldBySalesperson;
      const orderAmount = tag.paidAmountPaise ?? 39900;
      const spCommission = Math.round(orderAmount * (Number(sp.commissionPct) / 100));
      const resellerCommission = sp.reseller
        ? Math.round(orderAmount * 0.05)
        : 0;

      await tx.commission.create({
        data: {
          tagId: tag.id,
          salespersonId: sp.id,
          resellerId: sp.resellerId,
          orderAmountPaise: orderAmount,
          spCommissionPaise: spCommission,
          resellerCommissionPaise: resellerCommission,
          status: 'CREDITED',
          triggerReason: 'activation',
          creditedAt: new Date(),
        },
      });

      await tx.salesperson.update({
        where: { id: sp.id },
        data: {
          walletBalancePaise: { increment: spCommission },
          tagsActivated: { increment: 1 },
        },
      });

      if (sp.reseller) {
        await tx.reseller.update({
          where: { id: sp.reseller.id },
          data: { walletBalancePaise: { increment: resellerCommission } },
        });
      }

      await tx.tag.update({
        where: { id: tag.id },
        data: { commissionPaid: true },
      });
    });
  },
  { connection: redisConnection, concurrency: 3 },
);
```

---

## 12. E-commerce & Orders

### 12.1 Checkout endpoint

```javascript
// apps/api/src/routes/checkout.js
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@sampark/db';
import { razorpayClient } from '@sampark/comm-clients/razorpay';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const CheckoutSchema = z.object({
  items: z.array(z.object({
    productId: z.number(),
    quantity: z.number().int().min(1),
  })),
  shippingAddress: z.object({
    name: z.string(),
    phone: z.string(),
    line1: z.string(),
    line2: z.string().optional(),
    city: z.string(),
    state: z.string(),
    pincode: z.string().regex(/^\d{6}$/),
    country: z.string().default('IN'),
  }),
  paymentMethod: z.enum(['razorpay', 'cod']),
  referralCode: z.string().optional(),
});

router.post('/checkout', requireAuth, async (req, res) => {
  const parsed = CheckoutSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const data = parsed.data;

  const products = await prisma.product.findMany({
    where: { id: { in: data.items.map((i) => i.productId) }, isActive: true },
  });

  if (products.length !== data.items.length) {
    return res.status(400).json({ error: 'One or more products unavailable' });
  }

  let subtotal = 0;
  const items = data.items.map((i) => {
    const p = products.find((x) => x.id === i.productId);
    const total = p.pricePaise * i.quantity;
    subtotal += total;
    return { productId: p.id, quantity: i.quantity, unitPricePaise: p.pricePaise, totalPaise: total };
  });

  const shipping = subtotal > 50000 ? 0 : 4900; // free above ₹500
  const total = subtotal + shipping;

  const resellerId = data.referralCode
    ? (await prisma.reseller.findUnique({ where: { referralCode: data.referralCode } }))?.id
    : null;

  const orderNumber = `SPK-${new Date().getFullYear()}-${String(Date.now()).slice(-8)}`;

  const order = await prisma.order.create({
    data: {
      orderNumber,
      userId: req.user.id,
      resellerId,
      status: 'PENDING',
      paymentMethod: data.paymentMethod,
      subtotalPaise: subtotal,
      shippingPaise: shipping,
      totalPaise: total,
      shippingAddress: data.shippingAddress,
      items: { create: items },
    },
  });

  if (data.paymentMethod === 'razorpay') {
    const rzpOrder = await razorpayClient.orders.create({
      amount: total,
      currency: 'INR',
      receipt: orderNumber,
      notes: { orderId: String(order.id) },
    });

    await prisma.order.update({
      where: { id: order.id },
      data: { razorpayOrderId: rzpOrder.id },
    });

    return res.json({
      orderId: order.id,
      razorpayOrderId: rzpOrder.id,
      amount: total,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  }

  return res.json({ orderId: order.id, requiresCodConfirmation: true });
});

export default router;
```

### 12.2 Payment verification & tag assignment

```javascript
// apps/api/src/routes/webhooks-razorpay.js
import { Router } from 'express';
import crypto from 'node:crypto';
import { prisma } from '@sampark/db';
import { shipmentQueue } from '../queues/shipment.js';

const router = Router();

router.post('/webhooks/razorpay', async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return res.status(400).json({ error: 'Invalid signature' });
  }

  const event = req.body.event;

  if (event === 'order.paid' || event === 'payment.captured') {
    const rzpOrderId = req.body.payload.order?.entity?.id
      ?? req.body.payload.payment.entity.order_id;

    const order = await prisma.order.findFirst({
      where: { razorpayOrderId: rzpOrderId },
      include: { items: { include: { product: true } } },
    });

    if (!order || order.status !== 'PENDING') return res.json({ ok: true });

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'PAID',
          paymentStatus: 'paid',
          razorpayPaymentId: req.body.payload.payment.entity.id,
        },
      });

      for (const item of order.items) {
        if (!item.product.tagType) continue;

        const tagIds = await tx.$queryRaw`
          SELECT id FROM tags
          WHERE tag_type = ${item.product.tagType}::text::"TagType"
            AND status = 'AVAILABLE'
          ORDER BY id ASC
          LIMIT ${item.quantity}
          FOR UPDATE SKIP LOCKED
        `;

        if (tagIds.length < item.quantity) {
          throw new Error(`Insufficient inventory for ${item.product.tagType}`);
        }

        await tx.tag.updateMany({
          where: { id: { in: tagIds.map((t) => t.id) } },
          data: {
            status: 'SOLD_PENDING_ACTIVATION',
            userId: order.userId,
            soldToPhone: order.shippingAddress.phone,
            soldAt: new Date(),
            paidAt: new Date(),
            paidAmountPaise: item.product.pricePaise,
            paymentMethod: 'RAZORPAY_CHECKOUT',
            activationChannel: 'ONLINE_PHYSICAL',
            activationExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            orderId: order.id,
          },
        });
      }
    });

    await shipmentQueue.add('create-shiprocket-order', { orderId: order.id });
  }

  res.json({ ok: true });
});

export default router;
```

Note the `FOR UPDATE SKIP LOCKED` — this is the Postgres-native inventory allocation primitive that guarantees no two concurrent orders get the same tag.

---

## 13. Reminder Engine

BullMQ scheduled jobs, running daily.

```javascript
// apps/scheduler/src/index.js
import { Queue } from 'bullmq';
import { redisConnection } from './redis.js';

const remindersQueue = new Queue('reminders', { connection: redisConnection });

async function bootstrap() {
  // Daily reminder dispatch — 09:00 IST = 03:30 UTC
  await remindersQueue.upsertJobScheduler(
    'daily-reminders',
    { pattern: '30 3 * * *' },
    { name: 'dispatch-reminders', data: {} },
  );

  // Weekly commission payout check — Mondays 10:00 IST
  await remindersQueue.upsertJobScheduler(
    'weekly-payouts',
    { pattern: '30 4 * * 1' },
    { name: 'process-payouts', data: {} },
  );

  // Nightly tag cleanup — recycle expired sold_pending
  await remindersQueue.upsertJobScheduler(
    'nightly-cleanup',
    { pattern: '0 20 * * *' },
    { name: 'cleanup-expired-tags', data: {} },
  );

  console.log('Scheduler bootstrapped');
}

bootstrap();
```

```javascript
// apps/comm-worker/src/workers/reminders.js
import { Worker } from 'bullmq';
import { prisma } from '@sampark/db';
import { commQueue } from '../queues/comm.js';
import { redisConnection } from '../lib/redis.js';

new Worker(
  'reminders',
  async (job) => {
    if (job.name !== 'dispatch-reminders') return;

    const today = new Date();
    const checkpoints = [
      { days: 30, field: 'sent30d' },
      { days: 7, field: 'sent7d' },
      { days: 1, field: 'sent1d' },
    ];

    for (const { days, field } of checkpoints) {
      const target = new Date(today);
      target.setDate(target.getDate() + days);
      target.setHours(0, 0, 0, 0);
      const nextDay = new Date(target);
      nextDay.setDate(target.getDate() + 1);

      const reminders = await prisma.reminder.findMany({
        where: {
          dueDate: { gte: target, lt: nextDay },
          [field]: false,
        },
        include: { user: true, vehicle: true },
      });

      const friendly = {
        puc: 'PUC certificate',
        insurance: 'car insurance',
        fastag: 'FasTag',
        rc: 'RC / registration',
      };

      for (const r of reminders) {
        const msg = `Your ${friendly[r.reminderType]} expires in ${days} day${days > 1 ? 's' : ''} ` +
          `(${r.dueDate.toISOString().slice(0, 10)}). Renew via app.sampark.me`;

        const channels = r.channels.split(',');
        if (channels.includes('sms')) {
          await commQueue.add('send-sms', { phone: r.user.phone, body: msg });
        }
        if (channels.includes('whatsapp')) {
          await commQueue.add('send-whatsapp-template', {
            phone: r.user.phone,
            template: 'renewal_reminder',
            params: {
              type: r.reminderType,
              days: String(days),
              date: r.dueDate.toISOString().slice(0, 10),
            },
          });
        }

        await prisma.reminder.update({
          where: { id: r.id },
          data: { [field]: true },
        });
      }
    }
  },
  { connection: redisConnection },
);
```

---

## 14. Digital eTag Generation

Instant PDF generation using Puppeteer + HTML template.

```javascript
// apps/api/src/services/etag.js
import puppeteer from 'puppeteer';
import QRCode from 'qrcode';
import { prisma } from '@sampark/db';
import { generateTagCode } from '@sampark/db/utils';
import { uploadToR2 } from '../lib/storage.js';

export async function generateEtag({ userId, vehicleData, isPaid }) {
  // 1. Get an available eTag from pool or create new
  const tag = await prisma.$transaction(async (tx) => {
    const existing = await tx.tag.findFirst({
      where: { tagType: 'ETAG', status: 'AVAILABLE' },
      orderBy: { id: 'asc' },
    });

    let tagId;
    if (existing) {
      tagId = existing.id;
    } else {
      const newTag = await tx.tag.create({
        data: { code: generateTagCode(), tagType: 'ETAG' },
      });
      tagId = newTag.id;
    }

    return tx.tag.update({
      where: { id: tagId },
      data: {
        status: 'ACTIVE',
        userId,
        soldAt: new Date(),
        paidAt: isPaid ? new Date() : null,
        paymentMethod: isPaid ? 'RAZORPAY_CHECKOUT' : 'FREE',
        activationChannel: 'ONLINE_ETAG',
        activatedAt: new Date(),
        displayName: vehicleData.displayName,
      },
    });
  });

  // 2. Generate QR
  const url = `${process.env.PUBLIC_URL}/t/${tag.code}`;
  const qrDataUrl = await QRCode.toDataURL(url, {
    errorCorrectionLevel: 'H',
    width: 400,
    margin: 1,
  });

  // 3. Render HTML template
  const html = `
    <!DOCTYPE html>
    <html><head><style>
      body { font-family: -apple-system, sans-serif; margin: 0; padding: 40px; }
      .card { max-width: 500px; margin: auto; text-align: center; }
      h1 { font-size: 32px; margin-bottom: 4px; }
      .subtitle { color: #666; margin-bottom: 40px; }
      .qr { margin: 20px auto; }
      .plate { font-size: 24px; font-weight: bold; letter-spacing: 4px; margin-top: 20px; }
      .code { color: #999; font-size: 14px; margin-top: 8px; }
      .footer { color: #999; font-size: 12px; margin-top: 60px; }
    </style></head>
    <body>
      <div class="card">
        <h1>Sampark eTag</h1>
        <div class="subtitle">Scan to reach me — privately.</div>
        <img class="qr" src="${qrDataUrl}" width="300" height="300" />
        <div class="plate">${vehicleData.registrationNumber}</div>
        <div class="code">Tag: ${tag.code}</div>
        <div class="footer">
          Print at any size. Stick to your dashboard, laminate, or use digitally.<br>
          Works with any QR scanner — no app needed.
        </div>
      </div>
    </body></html>
  `;

  // 4. Puppeteer → PDF
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
  });
  await browser.close();

  // 5. Upload
  const pdfUrl = await uploadToR2(`etags/${tag.code}.pdf`, pdfBuffer, 'application/pdf');

  return { tag, pdfUrl };
}
```

For performance at scale, keep a warm Puppeteer instance (or use `puppeteer-cluster`) rather than launching Chromium on every request. In production, a pool of 2–4 Chromium instances handles hundreds of eTag generations per minute.

---

## 15. Admin Panel

### 15.1 Batch generation endpoint

```javascript
// apps/api/src/routes/admin-tags.js
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@sampark/db';
import { generateTagCode } from '@sampark/db/utils';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth, requireRole('ADMIN', 'SUPERADMIN'));

const CreateBatchSchema = z.object({
  quantity: z.number().int().min(1).max(10000),
  tagType: z.enum(['VEHICLE', 'BUSINESS_CARD', 'DOOR', 'LUGGAGE', 'ETAG']),
  notes: z.string().optional(),
});

router.post('/admin/tag-batches', async (req, res) => {
  const parsed = CreateBatchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const { quantity, tagType, notes } = parsed.data;

  const batchNumber = `B-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

  const batch = await prisma.tagBatch.create({
    data: { batchNumber, quantity, tagType, notes },
  });

  const codes = new Set();
  while (codes.size < quantity) {
    codes.add(generateTagCode());
  }

  const codeArr = [...codes];
  const chunkSize = 500;
  for (let i = 0; i < codeArr.length; i += chunkSize) {
    await prisma.tag.createMany({
      data: codeArr.slice(i, i + chunkSize).map((code) => ({
        code,
        tagType,
        batchId: batch.id,
      })),
      skipDuplicates: true,
    });
  }

  res.json({ batch, codesGenerated: codeArr.length });
});

const AllocateSchema = z.object({
  salespersonId: z.number(),
  count: z.number().int().min(1).max(1000),
  tagType: z.enum(['VEHICLE', 'BUSINESS_CARD', 'DOOR', 'LUGGAGE']),
});

router.post('/admin/tag-allocations', async (req, res) => {
  const parsed = AllocateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const { salespersonId, count, tagType } = parsed.data;

  try {
    const allocation = await prisma.$transaction(async (tx) => {
      const tagIds = await tx.$queryRaw`
        SELECT id FROM tags
        WHERE status = 'AVAILABLE'
          AND tag_type = ${tagType}::text::"TagType"
        ORDER BY id ASC
        LIMIT ${count}
        FOR UPDATE SKIP LOCKED
      `;

      if (tagIds.length < count) {
        throw new Error(`Only ${tagIds.length} tags available`);
      }

      const ids = tagIds.map((t) => t.id);

      await tx.tag.updateMany({
        where: { id: { in: ids } },
        data: {
          status: 'ALLOCATED_TO_SALESPERSON',
          allocatedToSalespersonId: salespersonId,
        },
      });

      const rec = await tx.tagAllocation.create({
        data: {
          salespersonId,
          tagIds: ids,
          quantity: count,
          allocatedBy: req.user.id,
        },
      });

      await tx.salesperson.update({
        where: { id: salespersonId },
        data: { tagsAllocated: { increment: count } },
      });

      return rec;
    });

    res.json({ allocation });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
```

---

## 16. Frontend Architecture

### 16.1 Vite React app skeleton (JSX)

```
apps/web-dashboard/
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── routes/
│   │   ├── index.jsx
│   │   ├── tags.jsx
│   │   ├── vehicles.jsx
│   │   ├── documents.jsx
│   │   ├── activation/
│   │   │   └── [code].jsx
│   │   └── settings.jsx
│   ├── components/
│   │   ├── ui/
│   │   └── ...
│   ├── lib/
│   │   ├── api.js
│   │   ├── auth.js
│   │   └── query.js
│   └── styles.css
├── vite.config.js
├── package.json
└── index.html
```

### 16.2 Typed-in-editor API client

```javascript
// apps/web-dashboard/src/lib/api.js
import axios from 'axios';
import { useAuthStore } from './auth.js';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  async (err) => {
    if (err.response?.status === 401 && !err.config._retry) {
      err.config._retry = true;
      try {
        const { data } = await axios.post(
          `${import.meta.env.VITE_API_URL}/auth/refresh`,
          {},
          { withCredentials: true },
        );
        useAuthStore.getState().setAccessToken(data.accessToken);
        err.config.headers.Authorization = `Bearer ${data.accessToken}`;
        return api.request(err.config);
      } catch {
        useAuthStore.getState().logout();
      }
    }
    return Promise.reject(err);
  },
);
```

### 16.3 Auth store

```javascript
// apps/web-dashboard/src/lib/auth.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      setAccessToken: (accessToken) => set({ accessToken }),
      setUser: (user) => set({ user }),
      logout: () => set({ accessToken: null, user: null }),
    }),
    { name: 'sampark-auth', partialize: (s) => ({ user: s.user }) },
  ),
);
```

### 16.4 vite.config.js

```javascript
// apps/web-dashboard/vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
```

---

## 17. Salesperson PWA

Vite React with vite-plugin-pwa.

```javascript
// apps/web-sales/vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.sampark\.example\/sales\/inventory/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'inventory-cache',
              networkTimeoutSeconds: 3,
              expiration: { maxAgeSeconds: 3600 },
            },
          },
        ],
      },
      manifest: {
        name: 'Sampark Sales',
        short_name: 'Sales',
        description: 'Salesperson tools for Sampark',
        theme_color: '#000000',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
});
```

Camera QR scanning in browser:

```jsx
// apps/web-sales/src/components/QRScanner.jsx
import { useEffect, useRef } from 'react';
import { BrowserQRCodeReader } from '@zxing/browser';

export function QRScanner({ onScan, onClose }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const reader = new BrowserQRCodeReader();
    let controls;

    (async () => {
      const devices = await BrowserQRCodeReader.listVideoInputDevices();
      const backCam = devices.find((d) => /back|rear/i.test(d.label)) ?? devices[0];
      controls = await reader.decodeFromVideoDevice(backCam.deviceId, videoRef.current, (result) => {
        if (result) {
          const text = result.getText();
          const match = text.match(/\/t\/([A-Z0-9]+)/);
          onScan(match?.[1] ?? text);
        }
      });
    })();

    return () => controls?.stop();
  }, [onScan]);

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <video ref={videoRef} className="flex-1 object-cover" />
      <button onClick={onClose} className="h-14 bg-white text-black font-medium">
        Cancel
      </button>
    </div>
  );
}
```

New Sale screen:

```jsx
// apps/web-sales/src/routes/new-sale.jsx
import { useState } from 'react';
import { toast } from 'sonner';
import { api } from '../lib/api.js';
import { QRScanner } from '../components/QRScanner.jsx';

export function NewSaleScreen() {
  const [tagCode, setTagCode] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [priceInRupees, setPriceInRupees] = useState(399);
  const [scanning, setScanning] = useState(false);

  async function handleScan(code) {
    setTagCode(code);
    setScanning(false);
  }

  async function submit() {
    try {
      const { data } = await api.post('/sales/sell', {
        tagCode,
        customerPhone,
        paymentMethod,
        pricePaise: priceInRupees * 100,
      });
      toast.success(
        paymentMethod === 'cash'
          ? 'Sale recorded. Customer will get activation SMS.'
          : 'Payment link sent to customer.'
      );
      setTagCode('');
      setCustomerPhone('');
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Sale failed');
    }
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-semibold">New sale</h1>

      <div className="space-y-2">
        <label className="text-sm text-gray-600">Tag code</label>
        <div className="flex gap-2">
          <input
            value={tagCode}
            onChange={(e) => setTagCode(e.target.value.toUpperCase())}
            placeholder="e.g., AB12CD"
            className="flex-1 h-12 px-3 border rounded-lg uppercase tracking-widest"
          />
          <button onClick={() => setScanning(true)} className="h-12 px-4 bg-black text-white rounded-lg">
            Scan
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm text-gray-600">Customer phone</label>
        <input
          value={customerPhone}
          onChange={(e) => setCustomerPhone(e.target.value)}
          type="tel"
          placeholder="+91 98765 43210"
          className="w-full h-12 px-3 border rounded-lg"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm text-gray-600">Payment</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setPaymentMethod('cash')}
            className={`h-12 rounded-lg border ${paymentMethod === 'cash' ? 'bg-black text-white' : ''}`}
          >
            Cash collected
          </button>
          <button
            onClick={() => setPaymentMethod('link')}
            className={`h-12 rounded-lg border ${paymentMethod === 'link' ? 'bg-black text-white' : ''}`}
          >
            Send payment link
          </button>
        </div>
      </div>

      <button
        onClick={submit}
        disabled={!tagCode || !customerPhone}
        className="w-full h-14 rounded-xl bg-black text-white font-medium disabled:opacity-40"
      >
        {paymentMethod === 'cash' ? 'Confirm sale' : 'Send payment link'}
      </button>

      {scanning && <QRScanner onScan={handleScan} onClose={() => setScanning(false)} />}
    </div>
  );
}
```

---

## 18. Third-party Integrations

| Service | Node package | Notes |
|---|---|---|
| **Exotel** | HTTP via `axios` | No official SDK, wrap yourself |
| **WhatsApp Cloud API** | HTTP via `axios` | Direct REST |
| **MSG91 / Fast2SMS** | HTTP via `axios` | For OTP delivery |
| **Razorpay** | `razorpay` (official) | Full-featured, well-maintained |
| **Shiprocket** | HTTP via `axios` | Straightforward REST |
| **Cloudflare R2** | `@aws-sdk/client-s3` (v3) | R2 is S3-compatible |
| **Sentry** | `@sentry/node`, `@sentry/react` | Official |
| **Firebase (push)** | `firebase-admin` | For FCM |

### 18.1 Razorpay wrapper example

```javascript
// packages/comm-clients/src/razorpay.js
import Razorpay from 'razorpay';

export const razorpayClient = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});
```

That's it — the official SDK covers orders, payment links, refunds, payouts (via RazorpayX), and route splits.

### 18.2 SMS wrapper example

```javascript
// packages/comm-clients/src/sms.js
import axios from 'axios';

// Using MSG91 as an example
export async function sendSms({ to, body, templateId }) {
  const { data } = await axios.post(
    'https://control.msg91.com/api/v5/flow/',
    {
      template_id: templateId ?? process.env.MSG91_DEFAULT_TEMPLATE,
      short_url: '0',
      recipients: [{ mobiles: to.replace(/^\+/, ''), body }],
    },
    {
      headers: {
        authkey: process.env.MSG91_AUTH_KEY,
        'Content-Type': 'application/json',
      },
    },
  );
  return data;
}
```

---

## 19. Security & Privacy

### 19.1 Non-negotiables

- **Owner phone never returned to unauthenticated clients.** Enforce this at the response serializer layer, not per-endpoint.
- **All PII fields redacted from logs.** Configure pino with a redaction list: `phone`, `email`, `photoUrl`, `bankDetailsEncrypted`.
- **S3/R2 URLs are pre-signed with 5-min TTL.** Never expose raw bucket URLs.
- **Rate limit every action endpoint.** Redis + sliding window via `rate-limiter-flexible`.
- **CORS** — allow only known origins (marketing site + dashboard + sales app).
- **Helmet.js** for security headers.

### 19.2 Rate limit setup

```javascript
// apps/api/src/middleware/rate-limit.js
import { RateLimiterRedis } from 'rate-limiter-flexible';
import { redisClient } from '../lib/redis.js';

export function rateLimit(opts) {
  const limiter = new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: opts.keyPrefix,
    points: opts.points,
    duration: opts.duration,
  });

  return async (req, res, next) => {
    const key = opts.keyExtractor?.(req) ?? req.ip ?? 'unknown';
    try {
      await limiter.consume(key);
      next();
    } catch (rej) {
      res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.round(rej.msBeforeNext / 1000),
      });
    }
  };
}
```

### 19.3 Structured logging

```javascript
// apps/api/src/lib/logger.js
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  redact: {
    paths: [
      'phone',
      'email',
      'body.phone',
      'body.email',
      'body.password',
      'body.otp',
      'body.customerPhone',
      'headers.authorization',
      'headers.cookie',
      '*.phone',
      '*.email',
    ],
    censor: '[REDACTED]',
  },
});
```

### 19.4 DLT & DPDP compliance

Same requirements as before, unaffected by stack choice:

- Register on DLT portals (Jio, Airtel, VI) before sending any SMS
- Every template pre-approved
- Privacy policy + consent flow + account deletion + data access endpoints per DPDP Act 2023
- Encrypt document vault contents at rest (SSE)

---

## 20. Testing Strategy

### 20.1 Test pyramid

| Layer | Tool | Coverage target |
|---|---|---|
| Unit (pure functions, utils) | Vitest | ≥ 80% |
| Integration (route + DB) | Vitest + Supertest + testcontainers | ≥ 60% of critical paths |
| E2E (browser flows) | Playwright | happy paths + top failure modes |
| Load | k6 | scan page, call init, checkout |

### 20.2 Integration test example

```javascript
// apps/api/tests/activation.test.js
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { execSync } from 'node:child_process';
import { app } from '../src/app.js';
import { prisma } from '@sampark/db';

let container;

beforeAll(async () => {
  container = await new PostgreSqlContainer().start();
  process.env.DATABASE_URL = container.getConnectionUri();
  execSync('pnpm --filter @sampark/db migrate:deploy', { stdio: 'inherit' });
});

afterAll(async () => {
  await container.stop();
});

describe('POST /tags/:code/activate', () => {
  it('activates a paid pending tag', async () => {
    const tag = await prisma.tag.create({
      data: {
        code: 'TEST01',
        tagType: 'VEHICLE',
        status: 'SOLD_PENDING_ACTIVATION',
        soldToPhone: '+919876543210',
        paidAt: new Date(),
        paidAmountPaise: 39900,
        activationChannel: 'FIELD',
      },
    });

    const res = await request(app)
      .post('/tags/TEST01/activate')
      .send({
        phone: '+919876543210',
        vehicle: { registrationNumber: 'AS01AB1234' },
      });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    const updated = await prisma.tag.findUniqueOrThrow({ where: { id: tag.id } });
    expect(updated.status).toBe('ACTIVE');
    expect(updated.vehicleId).toBeDefined();
  });

  it('rejects activation of unpaid tag', async () => {
    await prisma.tag.create({
      data: {
        code: 'TEST02',
        tagType: 'VEHICLE',
        status: 'SOLD_PENDING_ACTIVATION',
        soldToPhone: '+919876543210',
      },
    });

    const res = await request(app)
      .post('/tags/TEST02/activate')
      .send({
        phone: '+919876543210',
        vehicle: { registrationNumber: 'AS01AB1234' },
      });

    expect(res.status).toBe(400);
  });
});
```

### 20.3 E2E scan test

```javascript
// tests/e2e/scan.spec.js
import { test, expect } from '@playwright/test';

test('scanner reaches call button on active tag', async ({ page }) => {
  await page.goto('/t/DEMO01');
  await expect(page.getByRole('heading')).toContainText(/./);
  await expect(page.getByRole('button', { name: /call/i })).toBeVisible();
});
```

---

## 21. Deployment & DevOps

### 21.1 Environments

- **Local:** Docker Compose (Postgres + Redis + all apps)
- **Staging:** Hetzner CX41, single-node Docker Swarm
- **Production:** AWS Mumbai (ap-south-1) — ECS Fargate or self-managed k3s

### 21.2 Sample Dockerfile (Express API)

```dockerfile
# apps/api/Dockerfile
FROM node:20-alpine AS base
RUN corepack enable

FROM base AS deps
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages ./packages
COPY apps/api/package.json ./apps/api/
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @sampark/db generate

FROM base AS runner
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY apps/api ./apps/api
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "apps/api/src/index.js"]
```

No build step — plain JS runs directly.

### 21.3 GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env: { POSTGRES_PASSWORD: test, POSTGRES_DB: test }
        ports: ['5432:5432']
        options: --health-cmd pg_isready
      redis:
        image: redis:7
        ports: ['6379:6379']
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @sampark/db generate
      - run: pnpm --filter @sampark/db migrate:deploy
        env: { DATABASE_URL: postgres://postgres:test@localhost:5432/test }
      - run: pnpm test
        env:
          DATABASE_URL: postgres://postgres:test@localhost:5432/test
          REDIS_URL: redis://localhost:6379

  build-and-deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build & push images
        run: |
          docker build -f apps/api/Dockerfile -t $REG/sampark-api:$SHA .
          docker build -f apps/comm-worker/Dockerfile -t $REG/sampark-worker:$SHA .
          docker push $REG/sampark-api:$SHA
          docker push $REG/sampark-worker:$SHA
      - name: Deploy
        run: |
          aws ecs update-service --cluster prod --service sampark-api --force-new-deployment
          aws ecs update-service --cluster prod --service sampark-worker --force-new-deployment
```

### 21.4 Local dev with Docker Compose

```yaml
# docker-compose.yml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: sampark
      POSTGRES_PASSWORD: sampark
      POSTGRES_DB: sampark
    ports: ['5432:5432']
    volumes: ['pg_data:/var/lib/postgresql/data']

  redis:
    image: redis:7-alpine
    ports: ['6379:6379']

  mailhog:
    image: mailhog/mailhog
    ports: ['8025:8025', '1025:1025']

volumes:
  pg_data:
```

### 21.5 Observability

- **Logs** — pino, JSON output, shipped to Loki via Promtail
- **Metrics** — `prom-client` in Express, `bullmq-otel` for queue metrics
- **Traces** — OpenTelemetry auto-instrumentation for Express + Prisma
- **Sentry** — one line per app (`Sentry.init`)

---

## 22. MVP Phasing & Roadmap

### Phase 0 — MVP (Weeks 1–10)

- Monorepo scaffold with pnpm + Turbo
- Prisma schema + migrations
- Auth (OTP + JWT)
- Marketing site (Next.js SSG)
- Public scan page (Next.js SSR) with active tag → contact card
- Owner dashboard (Vite React) — activate tag, add vehicle, view scan log
- Admin panel (Vite React) — batch generation, tag pool view, order fulfillment
- E-commerce checkout (Razorpay + COD)
- Shiprocket integration (create order + track)
- Exotel masked call via BullMQ worker
- SMS via MSG91

**Skipped in MVP:** WhatsApp, reminders, salesperson app, reseller portal, doc vault, digital eTag, NFC card, video door tag.

### Phase 1 — Traction (Weeks 11–18)

- WhatsApp Business API integration
- Document vault + upload
- Reminder engine (PUC, insurance, FasTag)
- Digital eTag generator + PDF via Puppeteer
- Push notifications (web push + PWA on dashboard)
- Multi-language scan page (Assamese, Bengali, Hindi)
- Real-time scan notifications via Socket.io

### Phase 2 — Sales channels (Weeks 19–28)

- Salesperson PWA (inventory, sell, earnings)
- Salesperson onboarding + KYC
- Admin tag allocation UI
- Razorpay Payment Links integration
- Commission engine with 7-day hold
- Weekly payouts via RazorpayX
- Reseller portal (wallet, referral, tiered pricing)
- Fraud detection dashboards

### Phase 3 — Expansion (Weeks 29–40)

- NFC Business Card SKU + designer tool
- Video Door Tag (video recording flow)
- React Native mobile app (owner + salesperson)
- Multi-country provider adapter (Twilio for USA/UK)
- Auto tools (fuel prices, loan calculator) as SEO plays

---

## 23. Cost Estimation

### 23.1 Development effort

| Phase | Weeks (solo) | Weeks (with 1 junior) |
|---|---|---|
| Phase 0 MVP | 12–14 | 8–10 |
| Phase 1 | 10 | 6–8 |
| Phase 2 | 10 | 6–8 |
| Phase 3 | 14 | 10 |
| **Total** | **~46 weeks (solo)** | **~30 weeks (with help)** |

### 23.2 Physical unit economics

- Tag COGS: ₹90–140 (COD-inclusive)
- Sell price: ₹399–499
- Gross margin: 65–75%

### 23.3 Ongoing per-scan costs

- Exotel call: ₹0.60–0.90/min
- Exotel SMS: ₹0.20–0.30 (transactional, DLT)
- WhatsApp utility: ₹0.115 per conversation
- Storage/R2: negligible

### 23.4 Infra monthly (MVP)

| Item | INR/month |
|---|---|
| AWS RDS Postgres (t4g.medium Multi-AZ) | ~₹4,500 |
| ECS Fargate (api + worker + scheduler) | ~₹6,000 |
| ElastiCache Redis | ~₹2,000 |
| S3/R2 + transfer | ~₹500 |
| Cloudflare (Free → Pro) | ₹0–₹1,700 |
| Exotel base + ExoPhone | ~₹2,500 |
| Domain, misc | ~₹500 |
| **Total** | **~₹16,000–20,000** |

Cheaper alternative: Hetzner CCX32 dedicated (~₹4,500/mo) running everything via Docker Compose + AWS RDS Mumbai only for the DB.

---

## 24. API Reference

### Public
```
GET  /tags/:code/public                    Get tag state + minimal info
POST /tags/:code/scan-log                  Log a scan (queued)
POST /tags/:code/call                      Initiate masked call
POST /tags/:code/sms                       Send masked SMS
POST /tags/:code/whatsapp                  Send WhatsApp message
GET  /comm-sessions/:id                    Poll session status
```

### Auth
```
POST /auth/request-otp
POST /auth/verify-otp
POST /auth/refresh
POST /auth/logout
GET  /auth/me
```

### Owner
```
GET  /owner/tags                           List my tags
POST /owner/tags/:code/activate
PATCH /owner/tags/:id
GET  /owner/tags/:id/scans
GET  /owner/vehicles
POST /owner/vehicles
POST /owner/documents                      Upload doc (multipart)
GET  /owner/reminders
POST /owner/emergency-contacts
```

### E-commerce
```
GET  /products
POST /checkout
POST /webhooks/razorpay
GET  /orders
GET  /orders/:id/track
```

### Salesperson
```
POST /sales/auth/request-otp
POST /sales/auth/verify-otp
GET  /sales/inventory
GET  /sales/inventory/verify/:code
POST /sales/sell
GET  /sales/sales
POST /sales/sales/:tagId/resend-activation
GET  /sales/earnings
POST /sales/payout-request
```

### Reseller
```
POST /reseller/apply
GET  /reseller/dashboard
POST /reseller/orders/bulk
GET  /reseller/wallet
```

### Admin
```
POST /admin/tag-batches
GET  /admin/tags?status=&type=&sp=
POST /admin/tag-allocations
POST /admin/salespersons
POST /admin/salespersons/:id/status
GET  /admin/commissions/pending
POST /admin/commissions/:id/approve-payout
GET  /admin/orders
GET  /admin/dashboard
```

### eTag
```
POST /etag/generate
GET  /etag/:code/pdf
POST /etag/:code/regenerate
```

### Webhooks
```
POST /webhooks/exotel
POST /webhooks/razorpay
POST /webhooks/razorpay-payment-link
POST /webhooks/shiprocket
POST /webhooks/whatsapp
```

---

## 25. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Exotel outage → dead product | Med | High | Provider adapter interface; automatic fallback to Twilio/Plivo |
| Node event loop blocked by heavy op | Med | Med | Push all heavy work (PDF, image, external API) to BullMQ workers |
| Prisma connection pool exhausted | Med | High | Configure `connection_limit` per instance; use PgBouncer for high concurrency |
| DLT template rejection blocks OTP | Med | High | Register 5+ variants early; keep fallback templates |
| COD fraud wave | Med | Med | OTP-confirm at checkout; ₹49 lock-in prepay; ML blocked pin codes |
| Puppeteer memory leaks | Med | Med | Long-lived Chromium pool with restart-on-N-uses; measure RSS |
| Physical tag defects (fade/adhesive) | Low | Med | Dual-vendor, sample UV-test each batch |
| Scam calls via platform | Med | High | Rate limit + owner block button + reCAPTCHA on message form |
| Meta rejects WhatsApp templates | Med | Med | Utility-only templates initially; use BSP for faster iteration |
| Sampark files suit | Low | High | Zero copied branding, copy, logo, tag design; independent IP |
| Data breach | Low | Critical | Encrypt at rest, redacted logs, quarterly pen tests, bug bounty |
| Scaling costs spiral | Low | Med | Edge cache scan page, R2 zero-egress, worker pool sizing |
| **Bug from mis-typed field (JS specific)** | Med | Med | Test critical paths (billing, activation, commission) at ≥90% coverage; use `// @ts-check` on those files for free IDE hints |

---

## Appendix A — `packages/db/src/utils.js`

```javascript
import crypto from 'node:crypto';

const CROCKFORD = '23456789ABCDEFGHJKMNPQRSTVWXYZ';

export function generateTagCode(length = 6) {
  const bytes = crypto.randomBytes(length);
  return Array.from(bytes)
    .map((b) => CROCKFORD[b % CROCKFORD.length])
    .join('');
}

export function generateReferralCode(name) {
  const prefix = name.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4) || 'REF';
  const suffix = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `${prefix}${suffix}`;
}
```

---

## Appendix B — Local dev bootstrap

```bash
# Clone & install
git clone <repo>
cd sampark
pnpm install

# Start Postgres + Redis
docker compose up -d db redis

# Migrate DB
pnpm db:migrate

# Seed sample data
pnpm --filter @sampark/db seed

# Start everything
pnpm dev

# Individual apps
pnpm --filter @sampark/api dev
pnpm --filter @sampark/web-marketing dev
pnpm --filter @sampark/web-dashboard dev
```

---

## Appendix C — Environment variables

```bash
# .env (root)
DATABASE_URL=postgres://sampark:sampark@localhost:5432/sampark
REDIS_URL=redis://localhost:6379

# JWT
JWT_ACCESS_SECRET=change-me
JWT_REFRESH_SECRET=change-me

# Razorpay
RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=xxx
RAZORPAY_WEBHOOK_SECRET=xxx

# Exotel
EXOTEL_SID=xxx
EXOTEL_KEY=xxx
EXOTEL_TOKEN=xxx
EXOTEL_SUBDOMAIN=api.exotel.com
EXOTEL_EXOPHONE=+91xxxxxxxxxx

# MSG91
MSG91_AUTH_KEY=xxx
MSG91_DEFAULT_TEMPLATE=xxx

# WhatsApp
WA_PHONE_ID=xxx
WA_ACCESS_TOKEN=xxx

# Shiprocket
SHIPROCKET_EMAIL=xxx
SHIPROCKET_PASSWORD=xxx

# Storage (Cloudflare R2)
R2_ACCESS_KEY=xxx
R2_SECRET_KEY=xxx
R2_BUCKET=sampark-files
R2_ENDPOINT=https://xxx.r2.cloudflarestorage.com

# App
PUBLIC_URL=https://spk.example.com
NODE_ENV=development
```

---

*End of document. This is the working technical spec — plain JavaScript, ESM, no build step for backend. Iterate on this before touching a keyboard.*
