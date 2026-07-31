# Sampark Clone — Technical Implementation Document

**Prepared for:** Gobinda / Cybernet
**Reference product:** [sampark.me](https://sampark.me) by NGF132 Pvt Ltd
**Version:** 1.0
**Date:** July 2026

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Anatomy](#2-product-anatomy)
3. [System Architecture](#3-system-architecture)
4. [Recommended Tech Stack](#4-recommended-tech-stack)
5. [Database Schema](#5-database-schema)
6. [Core Module Implementations](#6-core-module-implementations)
7. [Third-party Integrations](#7-third-party-integrations)
8. [Security, Privacy & Compliance](#8-security-privacy--compliance)
9. [Mobile Application Strategy](#9-mobile-application-strategy)
10. [Deployment & DevOps](#10-deployment--devops)
11. [MVP Phasing & Roadmap](#11-mvp-phasing--roadmap)
12. [Cost & Effort Estimation](#12-cost--effort-estimation)
13. [Risks & Mitigations](#13-risks--mitigations)

---

## 1. Executive Summary

### 1.1 What we are building

A **privacy-first contact platform anchored by a physical QR/NFC tag**. The tag lives on a vehicle (or any object — business card, door, luggage). When anyone scans it, they land on a public web page and can call, SMS, or WhatsApp the owner **through a masked/virtual number**. The owner's real number is never exposed.

The physical tag is the wedge product. The recurring value comes from:

- The **communication routing layer** (pays per call/SMS)
- The **owner dashboard** (documents, reminders, scan logs, emergency contacts)
- **Adjacent SKUs** (NFC business cards, video door tags, digital eTags)
- A **reseller/franchise channel** for offline distribution

### 1.2 Why the reference product works

Reading the Sampark site carefully, three things carry the business:

| Layer | Why it matters |
|---|---|
| **Trust ("never share your number")** | Every homepage line reinforces privacy — this is the emotional hook |
| **Zero-friction scan flow** | Scanner does not need to install an app. Any QR reader works. This is critical for adoption. |
| **Owner utility beyond the scan** | FasTag reminders, doc vault, scan logs — these keep the owner logged in and give the product recurring relevance beyond the one-time scan event |

Any clone that gets those three right will work. Anything that misses one will not.

### 1.3 Product SKUs to implement

| SKU | Priority | Notes |
|---|---|---|
| Car & Bike Sampark Tag | **P0** | Primary revenue driver |
| Free eTag (digital PDF) | **P0** | Zero-cost user acquisition |
| NFC Business Card | P1 | Higher-margin, targets freelancers/creators |
| Video Door Tag | P2 | Requires camera flow |
| Reseller/Franchise portal | P1 | Offline distribution multiplier |

---

## 2. Product Anatomy

### 2.1 Physical tag specification

- **Material:** Weatherproof vinyl sticker (outdoor UV/water resistant) or PVC card
- **Print:** QR code (encoding short URL) + optional NFC chip (NTAG213/215) programmed with same URL
- **Adhesive:** 3M automotive-grade for car/bike variants
- **Unique code per tag:** e.g., `AB12CD` (6-char base32) or `SPK-XXXXXX`
- **URL encoded:** `https://spk.example.com/t/AB12CD` (short domain, HTTPS mandatory for iOS NFC)

**Tag lifecycle:**
```
Manufactured  →  Bulk-loaded into DB (unactivated)  →  Shipped in order
     →  Delivered to buyer  →  Buyer scans/opens app to activate
     →  Linked to user account + vehicle  →  Live
```

### 2.2 Scanner journey (public, no auth required)

1. Any camera app scans QR → opens URL in browser
2. Server resolves tag code → loads a **fast, mobile-first, 1-page contact card**
3. Page shows:
   - Vehicle photo (optional) + registration plate
   - Owner display name (optional, e.g., "Rahul")
   - Three action buttons: **Call**, **SMS**, **WhatsApp**
   - Optional: emergency contact button, message-only field
4. When scanner taps Call:
   - Backend requests a **virtual/proxy number** from Exotel with a short TTL (say 15 minutes)
   - Scanner is either shown a virtual number to dial, or a `tel:` link auto-dials it
   - Exotel bridges scanner ↔ owner, keeping both numbers hidden from each other
5. Every scan is **logged** (timestamp, coarse geolocation via IP or optional GPS opt-in, user-agent)

### 2.3 Owner journey

1. Buys tag online or via reseller
2. Receives tag in mail (with insert card explaining activation)
3. Downloads app OR uses web app → scans own tag → activates
4. Enters:
   - Phone number (OTP verified)
   - Vehicle details (make/model/registration)
   - Optional: emergency contact, insurance details, PUC expiry, FasTag details
   - Optional: uploads RC/insurance PDFs to vault
5. Ongoing:
   - Gets push/SMS/WhatsApp notification when tag is scanned
   - Receives masked calls/SMS/WhatsApp
   - Gets renewal reminders (PUC, insurance, FasTag)
   - Views scan history + heatmap

---

## 3. System Architecture

### 3.1 High-level architecture

```
                    ┌──────────────────────────────────────┐
                    │           CDN / Edge                 │
                    │      (Cloudflare / CloudFront)       │
                    └────────────┬─────────────────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
       ┌──────▼──────┐    ┌──────▼──────┐    ┌──────▼──────┐
       │  Public     │    │  Owner Web  │    │  Marketing  │
       │  Scan Page  │    │  Dashboard  │    │  Site + Shop│
       │  (Next.js)  │    │  (Next.js)  │    │  (Next.js)  │
       └──────┬──────┘    └──────┬──────┘    └──────┬──────┘
              │                  │                  │
              └──────────────────┼──────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │      API Gateway         │
                    │   (Kong / Nginx / ALB)   │
                    └────────────┬─────────────┘
                                 │
      ┌──────────────┬───────────┼───────────┬──────────────┐
      │              │           │           │              │
┌─────▼──────┐ ┌─────▼─────┐ ┌───▼────┐ ┌────▼─────┐ ┌──────▼──────┐
│ Core API   │ │ Comm      │ │ Orders │ │ Reminder │ │  Reseller   │
│ (Laravel)  │ │ Service   │ │ Service│ │ Worker   │ │  Portal API │
│            │ │ (FastAPI) │ │(Laravel│ │(FastAPI) │ │  (Laravel)  │
│ Auth/Tags/ │ │ Exotel/WA │ │        │ │ Cron/Q   │ │             │
│ Vehicles   │ │ Webhooks  │ │        │ │          │ │             │
└─────┬──────┘ └─────┬─────┘ └───┬────┘ └────┬─────┘ └──────┬──────┘
      │              │           │           │              │
      └──────────────┴───────────┼───────────┴──────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   PostgreSQL (primary)  │
                    │   Redis (cache + queue) │
                    │   S3/R2 (docs + images) │
                    └─────────────────────────┘
```

### 3.2 Service breakdown

| Service | Language | Responsibility |
|---|---|---|
| **Core API** | Laravel 11 (PHP 8.3) | Auth (OTP), tags, users, vehicles, documents, dashboard data |
| **Comm Service** | FastAPI (Python 3.12) | Masked calls, SMS, WhatsApp routing, Exotel webhooks, session number allocation |
| **Orders Service** | Laravel 11 | Cart, checkout, Razorpay, Shiprocket, order state machine, COD reconciliation |
| **Reminder Worker** | FastAPI + Celery | Cron-driven jobs for PUC/FasTag/insurance reminders, retry logic |
| **Reseller Portal API** | Laravel 11 (module) | Reseller wallet, pricing tiers, order attribution, commissions |
| **Marketing site** | Next.js 15 (SSG) | Homepage, blog, product pages, SEO |
| **Owner web app** | Next.js 15 (SSR + CSR) | Dashboard, tag management, order history |
| **Public scan page** | Next.js 15 (SSR, edge-rendered) | Ultra-fast scan landing, no auth |
| **Mobile app** | React Native (Expo) | Wraps web app + adds native camera/NFC/push |

**Why this split:** Comm Service is Python/FastAPI because Exotel/WhatsApp webhook handling, retry policies, and telephony state machines are cleaner in async Python; also aligns with LangChain/LangGraph if you later want an AI voice assistant (a natural extension). Everything else is Laravel — proven, fast to build with, and you know it cold.

### 3.3 Data flow: a scan

```
Scanner phone                   Edge (Next.js SSR)              Core API              Comm Service           Exotel
     │                                  │                          │                       │                     │
     │──── GET /t/AB12CD ──────────────►│                          │                       │                     │
     │                                  │──── GET /tag/AB12CD ────►│                       │                     │
     │                                  │◄──── tag payload ────────│                       │                     │
     │◄─── HTML (contact card) ─────────│                          │                       │                     │
     │                                  │                          │                       │                     │
     │─── POST /scan/log ──────────────►│──── async log ──────────►│ (fire-and-forget)     │                     │
     │                                  │                          │                       │                     │
     │─── POST /connect/call ──────────►│─────────────────────────►│──── request bridge ──►│                     │
     │                                  │                          │                       │──── allocate ───────►│
     │                                  │                          │                       │◄─── virtual # ───────│
     │                                  │                          │◄─── virtual # +TTL ──│                     │
     │◄─── tel: link / dial page ───────│◄─────────────────────────│                       │                     │
     │─── dials virtual # ─────────────────────────────────────────────────────────────────────────────────────►│
     │                                  │                          │                       │                     │
     │                                  │                          │                       │◄── bridges call ────│
     │                                  │                          │                       │      to owner       │
```

---

## 4. Recommended Tech Stack

Aligned with your existing stack for maximum velocity.

### 4.1 Frontend

| Concern | Choice | Why |
|---|---|---|
| Framework | **Next.js 15** (App Router) | SSR + SSG + edge, one project for public + dashboard |
| Language | **TypeScript 5+** | Non-negotiable at this scale |
| Styling | **Tailwind CSS + shadcn/ui** | Rapid, consistent, matches your prior work |
| State | **Zustand** (client), **TanStack Query** (server) | Simple, works |
| Forms | **react-hook-form + zod** | Validation on both sides |
| QR generation (owner side) | `qrcode` npm package | For generating printable/downloadable QRs |
| QR scanning (owner app) | `@zxing/browser` or native camera via RN | Only needed for owner tag activation |

### 4.2 Backend

| Concern | Choice | Why |
|---|---|---|
| Core API | **Laravel 11 + PHP 8.3** | Your primary stack; Eloquent, queues, auth all built-in |
| Comm Service | **FastAPI + Python 3.12** | Better for async telephony webhooks and long-poll patterns |
| Auth | **Sanctum (Laravel)** + **OTP via SMS** | Passwordless mobile-first flow |
| Queue | **Laravel Horizon** (Redis) + **Celery** (Python side) | Both are mature |
| ORM | **Eloquent** (PHP) + **SQLAlchemy 2** (Python) | Both talk to same PostgreSQL |
| PDF generation | **ReportLab** (Python) — you have prior experience | For eTag, invoice, audit report |
| Image processing | **Pillow** (Python side), **Intervention Image** (Laravel side) | For vehicle photos |

### 4.3 Data layer

| Concern | Choice |
|---|---|
| Primary DB | **PostgreSQL 16** |
| Cache | **Redis 7** |
| Queue broker | **Redis** (Laravel Horizon) + **Redis** (Celery) |
| Object storage | **Cloudflare R2** (S3-compatible, cheaper egress) or **AWS S3** |
| CDN | **Cloudflare** (free tier goes far) |
| Search (Phase 2) | **Meilisearch** — for reseller/order search |

### 4.4 Infra

| Concern | Choice |
|---|---|
| Hosting | **Hetzner Cloud** (India: **AWS Mumbai** for low latency) — dedicated CX servers are 5–10x cheaper than AWS for equivalent perf |
| Container | **Docker + Docker Compose** for dev; **Docker Swarm** or **k3s** for production |
| CI/CD | **GitHub Actions** |
| Monitoring | **Grafana + Prometheus + Loki**, **Sentry** for error tracking |
| SSL | **Cloudflare** (auto) or **Let's Encrypt** |

**On the India-specific hosting call:** For a QR scan product where every millisecond of the scan-to-page latency matters (a slow page = a lost interaction), origin in **AWS ap-south-1 (Mumbai)** behind Cloudflare is worth the premium over Hetzner Europe. Cache aggressively at the edge — many scan pages can be edge-cached with a short TTL.

---

## 5. Database Schema

Below is the core PostgreSQL schema. Only key columns shown; add `created_at`, `updated_at`, `deleted_at` (soft delete) throughout.

### 5.1 Users, auth, vehicles

```sql
-- ============================================================
-- USERS & AUTH
-- ============================================================
CREATE TABLE users (
    id                  BIGSERIAL PRIMARY KEY,
    phone               VARCHAR(20) UNIQUE NOT NULL,          -- E.164 format
    phone_verified_at   TIMESTAMPTZ,
    email               VARCHAR(255) UNIQUE,
    email_verified_at   TIMESTAMPTZ,
    name                VARCHAR(255),
    country_code        VARCHAR(2) DEFAULT 'IN',
    language            VARCHAR(5) DEFAULT 'en',
    push_token          TEXT,                                  -- FCM/APNs token
    role                VARCHAR(20) DEFAULT 'customer',        -- customer, admin, reseller
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ
);
CREATE INDEX idx_users_phone ON users(phone);

CREATE TABLE otps (
    id              BIGSERIAL PRIMARY KEY,
    phone           VARCHAR(20) NOT NULL,
    code_hash       VARCHAR(255) NOT NULL,                    -- bcrypt hash of 6-digit code
    purpose         VARCHAR(50) NOT NULL,                     -- login, doc_upload, etc.
    attempts        INT DEFAULT 0,
    expires_at      TIMESTAMPTZ NOT NULL,
    consumed_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_otps_phone ON otps(phone, purpose) WHERE consumed_at IS NULL;

-- ============================================================
-- VEHICLES
-- ============================================================
CREATE TABLE vehicles (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT REFERENCES users(id) ON DELETE CASCADE,
    registration_number VARCHAR(20),                          -- e.g., AS01AB1234
    make                VARCHAR(100),                         -- Maruti
    model               VARCHAR(100),                         -- Swift
    vehicle_type        VARCHAR(20),                          -- car, bike, truck
    color               VARCHAR(50),
    year_of_purchase    INT,
    photo_url           TEXT,
    fastag_number       VARCHAR(50),
    fastag_expires_at   DATE,
    puc_expires_at      DATE,
    insurance_expires_at DATE,
    rc_expires_at       DATE,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ
);
CREATE INDEX idx_vehicles_user ON vehicles(user_id);
CREATE INDEX idx_vehicles_reg ON vehicles(registration_number);

CREATE TABLE emergency_contacts (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT REFERENCES users(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    phone       VARCHAR(20) NOT NULL,
    relation    VARCHAR(50),
    is_primary  BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.2 Tags, scans, logs

```sql
-- ============================================================
-- TAGS
-- ============================================================
CREATE TABLE tags (
    id              BIGSERIAL PRIMARY KEY,
    code            VARCHAR(20) UNIQUE NOT NULL,              -- e.g., 'AB12CD'
    tag_type        VARCHAR(30) NOT NULL,                     -- vehicle, business_card, door, luggage
    batch_id        BIGINT REFERENCES tag_batches(id),
    status          VARCHAR(20) DEFAULT 'unactivated',        -- unactivated, active, disabled, lost
    activated_at    TIMESTAMPTZ,
    user_id         BIGINT REFERENCES users(id),              -- NULL until activated
    vehicle_id      BIGINT REFERENCES vehicles(id),           -- for vehicle tags
    order_id        BIGINT REFERENCES orders(id),             -- which order shipped this tag
    display_name    VARCHAR(255),                             -- shown on scan page ("Rahul")
    scan_count      INT DEFAULT 0,
    last_scanned_at TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ
);
CREATE UNIQUE INDEX idx_tags_code ON tags(code);
CREATE INDEX idx_tags_user ON tags(user_id) WHERE status = 'active';

CREATE TABLE tag_batches (
    id              BIGSERIAL PRIMARY KEY,
    batch_number    VARCHAR(50) UNIQUE NOT NULL,
    quantity        INT NOT NULL,
    tag_type        VARCHAR(30) NOT NULL,
    manufactured_at DATE,
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SCANS (append-only log)
-- ============================================================
CREATE TABLE scans (
    id              BIGSERIAL PRIMARY KEY,
    tag_id          BIGINT REFERENCES tags(id) ON DELETE CASCADE,
    ip_address      INET,
    country         VARCHAR(2),
    city            VARCHAR(100),
    lat             NUMERIC(9,6),                             -- if opt-in
    lng             NUMERIC(9,6),
    user_agent      TEXT,
    device_type     VARCHAR(20),                              -- mobile, tablet, desktop
    referer         TEXT,
    session_id      UUID,                                     -- de-dupe rapid re-scans
    action_taken    VARCHAR(20),                              -- call, sms, whatsapp, view_only
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_scans_tag ON scans(tag_id, created_at DESC);

-- Consider partitioning scans by month once volume grows.
```

### 5.3 Communication sessions & documents

```sql
-- ============================================================
-- COMMUNICATION SESSIONS (masked call/sms)
-- ============================================================
CREATE TABLE comm_sessions (
    id                  BIGSERIAL PRIMARY KEY,
    tag_id              BIGINT REFERENCES tags(id),
    scan_id             BIGINT REFERENCES scans(id),
    channel             VARCHAR(20) NOT NULL,                 -- call, sms, whatsapp
    caller_phone        VARCHAR(20),                          -- the scanner's number (received via callback)
    owner_phone         VARCHAR(20) NOT NULL,                 -- always internal, never surfaced
    virtual_number      VARCHAR(20),                          -- Exotel-provided proxy
    provider            VARCHAR(20) DEFAULT 'exotel',         -- exotel, twilio, plivo
    provider_call_id    VARCHAR(100),                         -- Exotel SID
    status              VARCHAR(20),                          -- initiated, ringing, answered, completed, failed
    duration_seconds    INT,
    recording_url       TEXT,                                 -- if recording enabled
    cost_paise          INT,                                  -- per-call cost from Exotel
    expires_at          TIMESTAMPTZ,                          -- TTL for the virtual number
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    completed_at        TIMESTAMPTZ
);
CREATE INDEX idx_comm_sessions_tag ON comm_sessions(tag_id, created_at DESC);
CREATE INDEX idx_comm_sessions_provider ON comm_sessions(provider_call_id);

-- ============================================================
-- DOCUMENT VAULT
-- ============================================================
CREATE TABLE documents (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT REFERENCES users(id) ON DELETE CASCADE,
    vehicle_id      BIGINT REFERENCES vehicles(id) ON DELETE CASCADE,
    doc_type        VARCHAR(30) NOT NULL,                     -- rc, insurance, puc, driving_license, fastag
    file_url        TEXT NOT NULL,                            -- S3/R2 URL, private
    file_size       INT,
    mime_type       VARCHAR(50),
    expires_at      DATE,                                     -- for reminder generation
    ocr_extracted   JSONB,                                    -- optional OCR fields
    verified_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_documents_user_vehicle ON documents(user_id, vehicle_id);
CREATE INDEX idx_documents_expiring ON documents(expires_at) WHERE expires_at IS NOT NULL;

-- ============================================================
-- REMINDERS
-- ============================================================
CREATE TABLE reminders (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT REFERENCES users(id) ON DELETE CASCADE,
    vehicle_id      BIGINT REFERENCES vehicles(id) ON DELETE CASCADE,
    reminder_type   VARCHAR(30) NOT NULL,                     -- puc, insurance, fastag, rc
    due_date        DATE NOT NULL,
    channels        VARCHAR(50) DEFAULT 'sms,whatsapp',       -- comma-separated
    sent_30d        BOOLEAN DEFAULT FALSE,                    -- 30 days before
    sent_7d         BOOLEAN DEFAULT FALSE,
    sent_1d         BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_reminders_due ON reminders(due_date) WHERE sent_1d = FALSE;
```

### 5.4 E-commerce

```sql
-- ============================================================
-- PRODUCTS & ORDERS
-- ============================================================
CREATE TABLE products (
    id              BIGSERIAL PRIMARY KEY,
    slug            VARCHAR(255) UNIQUE NOT NULL,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    tag_type        VARCHAR(30),                              -- what tag type this product ships
    price_paise     INT NOT NULL,                             -- base price in INR paise
    price_map       JSONB,                                    -- {"USD": 599, "GBP": 499} etc
    stock           INT DEFAULT 0,
    images          JSONB,                                    -- array of image URLs
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE orders (
    id                  BIGSERIAL PRIMARY KEY,
    order_number        VARCHAR(50) UNIQUE NOT NULL,          -- SPK-2026-000001
    user_id             BIGINT REFERENCES users(id),
    reseller_id         BIGINT REFERENCES resellers(id),      -- NULL for direct
    status              VARCHAR(30) DEFAULT 'pending',        -- pending, paid, shipped, delivered, cancelled, refunded
    payment_method      VARCHAR(20),                          -- razorpay, cod
    payment_status      VARCHAR(20) DEFAULT 'pending',
    razorpay_order_id   VARCHAR(100),
    razorpay_payment_id VARCHAR(100),
    subtotal_paise      INT NOT NULL,
    shipping_paise      INT DEFAULT 0,
    tax_paise           INT DEFAULT 0,
    discount_paise      INT DEFAULT 0,
    total_paise         INT NOT NULL,
    currency            VARCHAR(3) DEFAULT 'INR',
    shipping_address    JSONB NOT NULL,                       -- name, phone, addr1, addr2, city, state, pin, country
    shiprocket_id       VARCHAR(100),
    awb_number          VARCHAR(100),
    tracking_url        TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    shipped_at          TIMESTAMPTZ,
    delivered_at        TIMESTAMPTZ
);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);

CREATE TABLE order_items (
    id              BIGSERIAL PRIMARY KEY,
    order_id        BIGINT REFERENCES orders(id) ON DELETE CASCADE,
    product_id      BIGINT REFERENCES products(id),
    quantity        INT NOT NULL DEFAULT 1,
    unit_price_paise INT NOT NULL,
    total_paise     INT NOT NULL
);
```

### 5.5 Resellers

```sql
-- ============================================================
-- RESELLERS / FRANCHISE
-- ============================================================
CREATE TABLE resellers (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT REFERENCES users(id) UNIQUE,
    business_name       VARCHAR(255) NOT NULL,
    gstin               VARCHAR(20),
    tier                VARCHAR(20) DEFAULT 'silver',         -- silver, gold, platinum
    commission_pct      NUMERIC(5,2) DEFAULT 15.00,
    wallet_balance_paise INT DEFAULT 0,
    total_sales_paise   BIGINT DEFAULT 0,
    referral_code       VARCHAR(20) UNIQUE,                   -- e.g., CYBNET01
    state               VARCHAR(50),
    city                VARCHAR(50),
    approved_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE reseller_wallet_txns (
    id              BIGSERIAL PRIMARY KEY,
    reseller_id     BIGINT REFERENCES resellers(id),
    order_id        BIGINT REFERENCES orders(id),
    type            VARCHAR(20) NOT NULL,                     -- credit, debit, payout, adjustment
    amount_paise    INT NOT NULL,
    balance_after   INT NOT NULL,
    reference       VARCHAR(100),
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 6. Core Module Implementations

### 6.1 Tag ID generation

Design goals: **short (fits on a small sticker), unambiguous (no 0/O, 1/I), non-guessable (rate-limits abuse), and printable in batches**.

**Recommended scheme:** 6-char base32 (Crockford alphabet, minus visually ambiguous chars), giving ~1 billion codes; with prefixes if needed.

```python
# Python — for batch tag generation script
import secrets

CROCKFORD = "23456789ABCDEFGHJKMNPQRSTVWXYZ"  # no 0/O/1/I/L/U

def generate_tag_code(length: int = 6) -> str:
    return ''.join(secrets.choice(CROCKFORD) for _ in range(length))

def generate_batch(size: int) -> list[str]:
    seen = set()
    while len(seen) < size:
        seen.add(generate_tag_code())
    return list(seen)
```

Then in Laravel, seed the `tags` table with a batch, generate QR PNGs, and hand them to your print vendor. Each tag row stays `status='unactivated'` until the customer activates it.

**QR code generation:**

```python
# Python — batch print-ready QR generation
import qrcode
from qrcode.image.styledpil import StyledPilImage

def make_qr_png(code: str, out_path: str, base_url: str = "https://spk.example.com/t/"):
    url = f"{base_url}{code}"
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_H,  # high error correction: survives scratches
        box_size=10,
        border=2,
    )
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    img.save(out_path)
```

### 6.2 Public scan page (Next.js App Router)

Critical constraints: **must be sub-1s on 3G**, no auth, edge-cacheable for anonymous users, must degrade gracefully if backend is slow.

```typescript
// app/t/[code]/page.tsx  — Next.js 15 App Router
import { notFound } from 'next/navigation';
import { ContactCard } from '@/components/ContactCard';

// Revalidate every 60s at the edge — good balance of freshness vs latency
export const revalidate = 60;

async function getTag(code: string) {
  const res = await fetch(`${process.env.API_URL}/api/tags/${code}/public`, {
    next: { revalidate: 60, tags: [`tag-${code}`] },
  });
  if (!res.ok) return null;
  return res.json();
}

export default async function TagPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const tag = await getTag(code);
  if (!tag) notFound();

  return <ContactCard tag={tag} />;
}
```

The `ContactCard` component renders three buttons. When the scanner taps "Call", we hit a POST endpoint that:
1. Creates a `comm_session` row
2. Requests a virtual number from Exotel
3. Returns the virtual number (or a `tel:` deep link) to the client
4. Client either dials directly or shows the number

```typescript
// components/ContactCard.tsx (simplified)
'use client';

import { useState } from 'react';

export function ContactCard({ tag }: { tag: any }) {
  const [dialing, setDialing] = useState(false);

  async function requestCall() {
    setDialing(true);
    // Log scan action + request bridge
    const res = await fetch(`/api/tags/${tag.code}/call`, { method: 'POST' });
    const { virtual_number } = await res.json();
    // Auto-dial on mobile
    window.location.href = `tel:${virtual_number}`;
    setDialing(false);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 bg-white">
      <div className="w-full max-w-sm space-y-6">
        {tag.vehicle_photo_url && (
          <img
            src={tag.vehicle_photo_url}
            alt="Vehicle"
            className="w-full aspect-video object-cover rounded-2xl"
          />
        )}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-semibold">{tag.display_name || 'Vehicle Owner'}</h1>
          {tag.registration_number && (
            <p className="text-gray-500 tracking-widest">{tag.registration_number}</p>
          )}
        </div>
        <div className="grid grid-cols-1 gap-3">
          <button
            onClick={requestCall}
            disabled={dialing}
            className="h-14 rounded-xl bg-black text-white font-medium active:scale-[0.99]"
          >
            {dialing ? 'Connecting…' : 'Call the owner'}
          </button>
          <a
            href={`/t/${tag.code}/message`}
            className="h-14 rounded-xl border border-gray-200 flex items-center justify-center font-medium"
          >
            Send a message
          </a>
          <a
            href={`/t/${tag.code}/whatsapp`}
            className="h-14 rounded-xl border border-gray-200 flex items-center justify-center font-medium"
          >
            WhatsApp
          </a>
        </div>
        <p className="text-xs text-center text-gray-400">
          The owner's number stays private. Powered by Sampark.
        </p>
      </div>
    </div>
  );
}
```

### 6.3 Masked call layer (FastAPI + Exotel)

Exotel's core primitive here is the **"Passthru" / "Connect" API**. You give it two numbers, it dials both, connects them, and neither side sees the other's real number — they see the Exotel virtual number.

```python
# comm_service/routes/call.py — FastAPI
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from datetime import datetime, timedelta
from .exotel import exotel_client
from .db import get_db, CommSession, Tag

router = APIRouter(prefix="/api/comm")

class CallRequest(BaseModel):
    tag_code: str
    scan_id: int | None = None
    caller_phone: str | None = None  # optional if we captured it

@router.post("/call")
async def initiate_call(req: CallRequest, db = Depends(get_db)):
    tag = await db.get_active_tag_by_code(req.tag_code)
    if not tag:
        raise HTTPException(404, "Tag not found or inactive")

    owner_phone = tag.user.phone

    # Rate limit: max 5 calls per tag per hour to prevent abuse
    if await db.count_recent_sessions(tag.id, hours=1) >= 5:
        raise HTTPException(429, "Too many attempts, please try again later")

    # Create session record
    session = await db.create_comm_session(
        tag_id=tag.id,
        scan_id=req.scan_id,
        channel="call",
        owner_phone=owner_phone,
        caller_phone=req.caller_phone,
        expires_at=datetime.utcnow() + timedelta(minutes=15),
    )

    # Ask Exotel to bridge the two numbers.
    # Exotel Connect API: /v1/Accounts/{sid}/Calls/connect
    exotel_response = await exotel_client.connect_call(
        from_number=req.caller_phone or "unknown",   # if we don't know caller, use a click-to-call flow instead
        to_number=owner_phone,
        caller_id=exotel_client.virtual_number,      # the ExoPhone shown to both parties
        status_callback=f"{settings.PUBLIC_URL}/api/comm/webhook/exotel",
    )

    session.provider_call_id = exotel_response["Call"]["Sid"]
    session.virtual_number = exotel_client.virtual_number
    session.status = "initiated"
    await db.save(session)

    return {
        "session_id": session.id,
        "virtual_number": exotel_client.virtual_number,
        "expires_at": session.expires_at,
    }

@router.post("/webhook/exotel")
async def exotel_webhook(payload: dict, db = Depends(get_db)):
    """Exotel calls this on state transitions. Verify signature."""
    call_sid = payload.get("CallSid")
    status = payload.get("Status")           # ringing, in-progress, completed, failed
    duration = payload.get("Duration")

    session = await db.get_session_by_provider_id(call_sid)
    if not session:
        return {"ok": True}

    session.status = status
    if duration:
        session.duration_seconds = int(duration)
    if status == "completed":
        session.completed_at = datetime.utcnow()

    await db.save(session)
    return {"ok": True}
```

**Important nuance — the "we don't know the caller's number" problem:** When someone scans a QR from a browser, we do not have their phone number. Two workarounds:

1. **Click-to-call, we call both parties:** Ask the scanner to submit their number in a form ("We'll connect you"). Then use Exotel's `connect` API to dial both parties. This is the Uber pattern and what most clones do.
2. **Just show a virtual number to dial:** Provision an Exotel virtual number tied to the tag for a limited time (15 min TTL). When anyone dials it, Exotel forwards to the owner. Cheaper and simpler, but you need a pool of virtual numbers.

Option 1 has better UX but requires the scanner to type their number. Option 2 is friction-free but ExoPhone allocation adds complexity. **Recommended: start with Option 1 for MVP, add Option 2 with number pooling in Phase 2.**

### 6.4 WhatsApp routing

Two paths:

**Path A (cheap, MVP):** Deep-link to `wa.me/<owner_masked_number>` — but this exposes the number. Not acceptable.

**Path B (correct):** Use **WhatsApp Business API** (via Meta Cloud API or an Indian BSP like Gupshup/Interakt). Give the scanner a form ("Send a message"). Backend forwards to the owner from your Business account, and owner replies through the same Business account. Two-way messaging is proxied through your account. You need approved message templates for the first message from the owner side outside the 24-hour session window.

```python
# comm_service/routes/whatsapp.py
@router.post("/whatsapp/message")
async def send_whatsapp(req: WhatsAppRequest, db = Depends(get_db)):
    tag = await db.get_active_tag_by_code(req.tag_code)
    # Send to owner via WhatsApp Business API with template
    await whatsapp_client.send_template(
        to=tag.user.phone,
        template="scan_notification",
        params={
            "vehicle": tag.vehicle.registration_number,
            "message": req.message,
            "reply_link": f"{settings.PUBLIC_URL}/reply/{session.id}",
        },
    )
    # Log to comm_sessions
```

### 6.5 Owner authentication (OTP)

Passwordless mobile-first. Standard flow:

```
POST /api/auth/request-otp   { phone: "+919876543210" }
  → generates 6-digit code, hashes it, stores in `otps` table, sends SMS via MSG91/Fast2SMS

POST /api/auth/verify-otp    { phone, code }
  → verifies hash, marks OTP consumed, issues Sanctum token
```

Laravel implementation:

```php
// app/Http/Controllers/Api/AuthController.php
public function requestOtp(Request $request)
{
    $data = $request->validate(['phone' => 'required|regex:/^\+[1-9]\d{1,14}$/']);

    // Rate limit: max 3 OTPs per phone per 15 min
    $recent = Otp::where('phone', $data['phone'])
        ->where('created_at', '>', now()->subMinutes(15))
        ->count();
    if ($recent >= 3) {
        return response()->json(['error' => 'Too many attempts'], 429);
    }

    $code = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);

    Otp::create([
        'phone' => $data['phone'],
        'code_hash' => Hash::make($code),
        'purpose' => 'login',
        'expires_at' => now()->addMinutes(10),
    ]);

    SmsService::send($data['phone'], "Your Sampark code is {$code}. Valid for 10 min.");

    return response()->json(['ok' => true]);
}

public function verifyOtp(Request $request)
{
    $data = $request->validate([
        'phone' => 'required',
        'code' => 'required|digits:6',
    ]);

    $otp = Otp::where('phone', $data['phone'])
        ->where('purpose', 'login')
        ->whereNull('consumed_at')
        ->where('expires_at', '>', now())
        ->latest()
        ->first();

    if (! $otp || ! Hash::check($data['code'], $otp->code_hash)) {
        if ($otp) $otp->increment('attempts');
        return response()->json(['error' => 'Invalid code'], 401);
    }

    $otp->update(['consumed_at' => now()]);

    $user = User::firstOrCreate(
        ['phone' => $data['phone']],
        ['phone_verified_at' => now()],
    );

    $token = $user->createToken('mobile')->plainTextToken;

    return response()->json(['token' => $token, 'user' => $user]);
}
```

### 6.6 Reminder engine

A daily cron scans upcoming expiries and enqueues messages.

```python
# reminder_worker/tasks.py — Celery beat
from celery import shared_task
from datetime import date, timedelta
from .db import Reminder, User
from .messengers import sms, whatsapp

@shared_task
def dispatch_reminders():
    """Runs daily at 9 AM IST."""
    today = date.today()
    checkpoints = [
        (30, 'sent_30d'),
        (7, 'sent_7d'),
        (1, 'sent_1d'),
    ]

    for days_ahead, sent_field in checkpoints:
        target_date = today + timedelta(days=days_ahead)
        reminders = Reminder.query.filter(
            Reminder.due_date == target_date,
            getattr(Reminder, sent_field) == False,
        ).all()

        for r in reminders:
            msg = build_message(r, days_ahead)
            channels = r.channels.split(',')
            if 'sms' in channels:
                sms.send(r.user.phone, msg)
            if 'whatsapp' in channels:
                whatsapp.send_template(r.user.phone, 'reminder', {
                    'type': r.reminder_type,
                    'days': str(days_ahead),
                    'date': r.due_date.isoformat(),
                })
            setattr(r, sent_field, True)
        db.session.commit()

def build_message(r, days):
    friendly = {
        'puc': 'PUC certificate',
        'insurance': 'car insurance',
        'fastag': 'FasTag',
        'rc': 'RC / registration',
    }[r.reminder_type]
    return f"Your {friendly} expires in {days} day{'s' if days > 1 else ''} " \
           f"({r.due_date.strftime('%d %b')}). Renew via app.sampark.me"
```

### 6.7 E-commerce & COD

Razorpay for prepaid, **Shiprocket** for shipping + COD reconciliation. COD flow is fraud-prone in India — mitigate with:

- OTP confirmation before order placement (verifies phone is reachable)
- Deposit/prepay a small amount (say ₹49) via Razorpay to lock the COD order
- After a certain COD refusal count, block the pin code or phone

Laravel order state machine:

```
pending  →  paid  →  packed  →  shipped  →  out_for_delivery  →  delivered
                                                              →  rto_initiated  →  rto_delivered
             ↳  cancelled  ↳  refunded
```

For COD:
```
pending  →  cod_confirmed (post-OTP)  →  packed  →  shipped  →  delivered (payment collected) / rto
```

Shiprocket integration is straightforward — create an order via their API, get an AWB, poll or receive webhooks for status transitions.

### 6.8 Free eTag PDF

The Free eTag is a customer acquisition tool: someone submits their vehicle number, and you email/WhatsApp them a personalized PDF with a QR that resolves to a hosted contact page (still using your masked communication layer).

- Uses **ReportLab** (which you already know from PolitIQ audit reports)
- Generates a branded PDF with the QR
- Delivers via WhatsApp Business API + email
- Zero shipping cost, hook for upsell to the physical tag

### 6.9 Reseller portal

Reseller onboarding:
1. Register with GSTIN + business details → goes into approval queue
2. Admin approves → wallet is created with 0 balance, referral code generated
3. Reseller deposits money into wallet via Razorpay
4. Reseller places bulk orders (buying tags at wholesale) → deducts from wallet
5. When reseller's referral code is used at checkout by an end customer, reseller gets a commission credited to wallet
6. Weekly/monthly payouts to reseller bank account via Razorpay Payouts / RazorpayX

You've built a similar Razorpay Route model for your event venue marketplace — the wallet + commission mechanics port over cleanly.

---

## 7. Third-party Integrations

| Service | Purpose | Alternative | Notes |
|---|---|---|---|
| **Exotel** | Masked voice + SMS | Twilio, Plivo, Knowlarity | Indian company, IVR-friendly, familiar to you |
| **WhatsApp Cloud API** (Meta) | WhatsApp | Gupshup, Interakt, AiSensy | Meta direct is cheapest at scale; BSPs are faster to launch |
| **MSG91 / Fast2SMS** | OTP SMS | Textlocal, Kaleyra | Cheap DLT-registered India transactional SMS |
| **Razorpay** | Payments | Cashfree, PayU | Standard checkout + Route for splits + Payouts for reseller payouts |
| **Shiprocket** | Shipping + COD | Delhivery Direct, Nimbuspost | Aggregator handles multiple carriers, COD reconciliation |
| **Cloudflare R2 / AWS S3** | Object storage | GCS | R2 has zero egress fees — big deal for scan-page image serving |
| **FCM + APNs** | Push notifications | OneSignal | Direct is fine; wrap with Expo Push if using RN |
| **Sentry** | Error tracking | Bugsnag | Self-hostable on your infra |
| **Meilisearch** | Reseller/order search | Typesense, Elasticsearch | Lightweight, fits your scale |

### 7.1 DLT registration (critical for SMS in India)

Before you can send a single transactional or promotional SMS in India, you must register on **DLT (Distributed Ledger Technology)** portals — Jio Trueconnect, Airtel IQ, Vodafone-Idea, BSNL. You register your entity, sender IDs (e.g., `SAMPRK`), and **every message template**. This takes 1–2 weeks. Do it in parallel with development.

Templates must be approved before use. So plan your reminder texts, OTP texts, order confirmation texts early.

---

## 8. Security, Privacy & Compliance

### 8.1 Privacy is the product

Everything privacy-adjacent gets extra care because it's your marketing hook.

- **Never expose owner phone number in any API response** returned to a public (unauthenticated) client. Not in JSON, not in HTML, not in logs, not in error responses.
- The owner's phone lives only in `users.phone`. The scan page never sees it.
- On call-connect, the `virtual_number` returned to the scanner is Exotel's ExoPhone — not the owner's number.
- Recording (if enabled) requires **explicit opt-in from both parties** per India's Telecom Consumer Protection rules. Better: don't record by default.

### 8.2 Rate limiting & abuse

- **Scan rate limit:** No limit on views (public). But limit action requests (call/sms/whatsapp): max 5 per tag per hour, max 20 per IP per hour.
- **OTP rate limit:** Max 3 per phone per 15 min; max 10 per IP per hour.
- **Order rate limit:** Max 3 orders per user per day (soft), max 5 per phone per day.
- Use **Redis + sliding window** counters for all of the above.

### 8.3 Data protection

- Encrypt document vault contents at rest (S3/R2 SSE).
- Sign document URLs with **short-lived pre-signed URLs** (5-min TTL) — never expose raw S3 URLs.
- All PII (`phone`, `email`, `photo_url`) redacted from logs. Use a Sentry scrubber.
- PostgreSQL: enable `pg_stat_statements` but disable statement text logging for tables containing PII.

### 8.4 India regulatory

- **DPDP Act 2023 compliance:** Publish a clear privacy policy, get explicit consent for processing PII, provide account deletion, respond to data access requests within 30 days.
- **TRAI DND & DLT:** All SMS templates registered on DLT before use. Do not send promotional SMS between 9 PM and 9 AM.
- **KYC for resellers:** GST verification, PAN verification for payouts.
- **RBI PA-PG guidelines:** Razorpay handles this, but if you ever hold customer money (wallets), you may need to structure as an escrow or use RazorpayX-backed sub-accounts.

### 8.5 International expansion

The tag URL is the same globally; only the communication provider changes:
- India: Exotel
- USA: Twilio or Bandwidth
- UK/EU: Twilio or MessageBird
- Middle East: Unifonic or Twilio

Build the `Comm` service with a **provider adapter interface** from day one so switching per country is a config change:

```python
class TelephonyProvider(Protocol):
    async def connect_call(self, from_number: str, to_number: str, caller_id: str) -> CallResult: ...
    async def send_sms(self, to: str, body: str) -> SmsResult: ...

class ExotelProvider: ...
class TwilioProvider: ...

# resolved per user country_code at call-time
def get_provider(country: str) -> TelephonyProvider: ...
```

---

## 9. Mobile Application Strategy

### 9.1 What the mobile app is for

- **Owner-side:** activate tags, upload docs, receive push notifications on scan, see scan history, reply to messages
- **Scanner-side:** they do NOT need the app. This is a core promise of the product.

### 9.2 Recommended approach

**React Native + Expo** — because:

- Your Next.js dashboard code (React + TS) ports over with light reshaping
- Expo handles push, camera, contacts, permissions without native module hell
- One codebase for iOS + Android
- OTA updates via Expo Updates — you can ship dashboard changes without store review

**Native-only features you'll need:**
- **Camera** for QR scan (activation flow, doc capture) → `expo-camera` + `expo-barcode-scanner`
- **NFC** (Android primarily; iOS is more restricted) → `react-native-nfc-manager`
- **Push notifications** → `expo-notifications` (wraps FCM + APNs)
- **File picker** for doc uploads → `expo-document-picker`
- **Contacts** for emergency contact selection → `expo-contacts`

### 9.3 App architecture

- Same **Core API** endpoints as web dashboard — the mobile app is another client, not a separate backend
- Session management via **Sanctum token** stored in `expo-secure-store`
- **Deep linking** for tag activation: `sampark://activate/AB12CD` — set up universal links for both platforms

### 9.4 PWA fallback (Phase 0)

For MVP, before you invest in native app store submission, ship the entire dashboard as a **PWA**. Users can "Add to Home Screen". Works for 90% of the value. Move to native RN once you have traction and specifically need NFC or better push reliability.

---

## 10. Deployment & DevOps

### 10.1 Environments

- **Local:** Docker Compose (all services + PG + Redis + Meilisearch)
- **Staging:** Single Hetzner CX41 with Docker Swarm
- **Production:** AWS Mumbai — ECS Fargate or a small k3s cluster on EC2. Postgres via RDS (Multi-AZ once revenue justifies). Redis via ElastiCache or self-managed.

### 10.2 CI/CD

GitHub Actions pipeline:

```yaml
# .github/workflows/deploy.yml (excerpt)
name: Deploy
on:
  push:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Test PHP
        run: docker compose -f docker-compose.ci.yml run --rm core-api php artisan test
      - name: Test Python
        run: docker compose -f docker-compose.ci.yml run --rm comm-service pytest
      - name: Test Frontend
        run: npm ci && npm run test && npm run lint
  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Build and push images
        run: |
          docker build -t $REG/core-api:$SHA -f core-api/Dockerfile .
          docker build -t $REG/comm-service:$SHA -f comm-service/Dockerfile .
          docker push $REG/core-api:$SHA
          docker push $REG/comm-service:$SHA
  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to ECS
        run: aws ecs update-service --cluster prod --service core-api --force-new-deployment
```

### 10.3 Observability

- **Logs:** Structured JSON, shipped to Loki via Promtail
- **Metrics:** Prometheus scrapes Laravel `/metrics` (via `spatie/laravel-prometheus`) and FastAPI `/metrics` (via `prometheus-fastapi-instrumentator`)
- **Dashboards:** Grafana (call success rate, scan-to-call conversion, latency P50/P95/P99, order funnel)
- **Errors:** Sentry with source maps for frontend
- **Uptime:** UptimeRobot or BetterStack for external checks

### 10.4 Critical dashboards to build day 1

| Metric | Why it matters |
|---|---|
| Scan-page P95 latency | Below 1.5s or you're losing scans |
| Call bridge success rate | Below 95% and Exotel/telco is broken |
| OTP delivery rate | Below 90% and SMS gateway is failing |
| Order-to-shipped time | Ops SLA |
| COD refusal rate by pin code | Fraud detection |

---

## 11. MVP Phasing & Roadmap

### Phase 0 — MVP (Weeks 1–8)

**Goal: sell your first 100 tags.**

- [ ] Marketing site (Next.js SSG) — home, product, about, contact
- [ ] Product catalog + cart + Razorpay checkout + COD
- [ ] Shiprocket integration (basic — create order, get AWB)
- [ ] Admin dashboard for order fulfillment
- [ ] Tag batch generator (script) + QR PNG generator
- [ ] Public scan page — call and SMS via Exotel Connect API (no WhatsApp yet)
- [ ] Owner auth (OTP via MSG91)
- [ ] Owner dashboard — activate tag, add vehicle, view scan log

**Skip for MVP:** WhatsApp, reminders, mobile app, reseller portal, document vault, NFC card, video door tag.

### Phase 1 — Traction (Weeks 9–16)

- [ ] WhatsApp Business API integration (via Gupshup for speed)
- [ ] Push notifications for scans (via PWA + web push, no native app yet)
- [ ] Document vault + upload flow
- [ ] Reminder engine (PUC, insurance, FasTag)
- [ ] Free eTag PDF generator + WhatsApp delivery
- [ ] Multi-language (Assamese, Bengali, Hindi) on scan page
- [ ] Basic analytics dashboard

### Phase 2 — Channel (Weeks 17–24)

- [ ] Reseller portal — signup, approval, wallet, bulk orders, commissions
- [ ] Reseller payouts via RazorpayX
- [ ] React Native mobile app (owner side)
- [ ] Number pooling for zero-friction scan-to-call
- [ ] Call recording (opt-in) + storage
- [ ] Multi-country support (currency switcher, provider adapter switch)

### Phase 3 — Product expansion (Weeks 25–36)

- [ ] NFC Business Card SKU (NTAG213/215) + card design tool
- [ ] Video Door Tag — scanner records video/audio, delivered to owner
- [ ] Auto tools (fuel prices, car loan calc, etc.) as SEO plays
- [ ] Referral program for end customers
- [ ] Loyalty tier (repeat scans → free reminders / doc storage upgrades)

---

## 12. Cost & Effort Estimation

### 12.1 Development effort (single senior full-stack + one JR + designer)

| Phase | Weeks | Notes |
|---|---|---|
| Phase 0 MVP | 8 | You + 1 junior; realistically 10 wks if solo |
| Phase 1 Traction | 8 | |
| Phase 2 Channel | 8 | |
| Phase 3 Expansion | 12 | |
| **Total to feature-parity** | **~36 weeks** | ~9 months |

Solo (you alone, day job in parallel with Cybernet contract work): double these to ~18 months for feature parity. MVP alone: realistically 12–14 weeks solo.

### 12.2 Physical unit economics

| Item | Cost (INR) |
|---|---|
| Vinyl sticker + QR print (in bulk 10k+) | ₹8–15 |
| Packaging (envelope + insert card) | ₹5 |
| Shipping (Shiprocket avg) | ₹40–70 |
| COD collection charge | ₹25–40 |
| Payment gateway (2%) | ~₹8 |
| **Total COGS per tag (COD)** | **~₹90–140** |
| **Sell price** | ₹399–499 |
| **Gross margin** | ~65–75% |

NFC cards: NTAG213 chips are ₹40–60 in bulk of 1000+; total COGS ~₹120–180.

### 12.3 Ongoing per-user costs

| Service | Cost | Notes |
|---|---|---|
| Exotel call (per min) | ₹0.60–0.90 | India, incl STD |
| Exotel SMS (transactional) | ₹0.20–0.30 | DLT-registered |
| WhatsApp Cloud API (utility) | ₹0.115 per convo | Meta pricing |
| WhatsApp (marketing) | ₹0.90+ per convo | Higher |
| Storage (R2) | ~$0.015/GB/month | Negligible |

Even if a customer generates 4 masked calls/month averaging 2 min each, that's ~₹5–7/month in comm costs. Very sustainable.

### 12.4 Infrastructure monthly (Phase 0 / MVP)

| Item | Cost (INR/month) |
|---|---|
| AWS RDS PostgreSQL (t4g.medium Multi-AZ) | ~₹4,500 |
| ECS Fargate (2 vCPU / 4GB, 3 services) | ~₹6,000 |
| ElastiCache Redis (small) | ~₹2,000 |
| S3 + data transfer | ~₹500 |
| Cloudflare (free plan → Pro when needed) | ₹0–₹1,700 |
| Exotel base + ExoPhone rental | ~₹2,000 base + ₹500/number |
| Domain, misc | ~₹500 |
| **Total** | **~₹16,000–20,000/month** |

Cheaper alternative: single Hetzner CCX32 dedicated (~₹4,500/month) running everything via Docker Swarm + AWS Mumbai only for RDS. Fine for the first year.

---

## 13. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Exotel outage during scan → dead product | Medium | High | Failover provider adapter (Plivo/Twilio); at minimum, gracefully fall back to showing a message form when telephony is down |
| DLT template rejection blocks OTP/reminders | Medium | High | Register 5+ template variants early; keep pre-approved fallbacks |
| COD fraud/refusal wave | Medium | Medium | OTP-confirm at checkout; ₹49 lock-in Razorpay prepay for COD; ML-blocked pin codes |
| Physical tag manufacturing defects (fading, adhesive failure) | Low | Medium | Contract with 2 print vendors; UV-print samples; sample-test each batch |
| Scam calls to owners via the platform | Medium | High | Rate limit + owner "block scanner" button + reCAPTCHA on message form |
| Meta rejects WhatsApp templates | Medium | Medium | Start with utility templates only; use a BSP (Gupshup) for faster template ops |
| Competitor (Sampark itself) sues | Low | High | Do not clone brand assets, logo, marketing copy, tag design. Ship your own IP end-to-end. |
| Data breach → phone numbers exposed | Low | Critical | Encrypt at rest, audit logs, offline PII backups, quarterly pen test, bug bounty |
| Scaling costs run away | Low | Medium | Cache scan pages aggressively at edge; R2 for zero-egress asset serving |

---

## Appendix A — API surface (partial)

### Public
```
GET  /api/tags/:code/public              → Tag metadata for scan page
POST /api/tags/:code/scan-log            → Log a scan event
POST /api/tags/:code/call                → Initiate masked call
POST /api/tags/:code/sms                 → Send masked SMS
POST /api/tags/:code/whatsapp            → Send WhatsApp message
```

### Auth
```
POST /api/auth/request-otp
POST /api/auth/verify-otp
POST /api/auth/logout
GET  /api/auth/me
```

### Owner
```
GET  /api/owner/tags                     → List my tags
POST /api/owner/tags/:code/activate      → Activate a tag
PUT  /api/owner/tags/:id                 → Update tag settings
GET  /api/owner/tags/:id/scans           → Scan history
GET  /api/owner/vehicles
POST /api/owner/vehicles
POST /api/owner/documents                → Upload doc (multipart)
GET  /api/owner/reminders
```

### E-commerce
```
GET  /api/products
POST /api/cart
POST /api/checkout                       → Creates Razorpay order
POST /api/webhooks/razorpay              → Payment confirmation
GET  /api/orders
GET  /api/orders/:id/track
```

### Reseller
```
POST /api/reseller/apply
GET  /api/reseller/dashboard
POST /api/reseller/orders/bulk
GET  /api/reseller/wallet
POST /api/reseller/payout-request
```

---

## Appendix B — Reading list & references

- **Exotel Connect API:** exotel.com/api/#connect-two-numbers
- **WhatsApp Cloud API:** developers.facebook.com/docs/whatsapp/cloud-api
- **Razorpay Route (for reseller splits):** razorpay.com/docs/payments/route
- **Shiprocket API:** apiv2.shiprocket.in
- **DLT registration portals:** trueconnect.jio.com, airtel.in/business, dlt.vodafoneidea.com
- **DPDP Act 2023 overview:** meity.gov.in/writereaddata/files/Digital%20Personal%20Data%20Protection%20Act%202023.pdf

---

*End of document. Iterate on this before you touch a keyboard — a clear spec now saves three weeks of rework later.*
