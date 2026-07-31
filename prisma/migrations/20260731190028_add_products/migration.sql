-- CreateTable
CREATE TABLE "products" (
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "pricePaise" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("slug")
);

-- Seed the catalogue that previously lived in lib/products.js, so existing
-- installs keep the same prices and a fresh database is immediately usable.
INSERT INTO "products" ("slug", "name", "description", "pricePaise", "sortOrder", "updatedAt") VALUES
  ('vehicle-tag',   'Vehicle Tag',   'A weatherproof QR sticker for your car or bike windshield.',            19900, 1, CURRENT_TIMESTAMP),
  ('business-card', 'Business Card', 'Share your contact details with a tap or a scan — no printing needed.', 24900, 2, CURRENT_TIMESTAMP),
  ('door-tag',      'Door Tag',      'Let visitors reach you without ringing the bell or knowing your number.', 14900, 3, CURRENT_TIMESTAMP),
  ('free-etag',     'Free eTag',     'Skip the sticker entirely — generate a digital QR you can share right away.', 0, 4, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;
