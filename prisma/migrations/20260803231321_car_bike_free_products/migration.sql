-- Narrow the catalogue to Car Tag, Bike Tag and Free eTag.
--
-- A data migration, not a schema one. Tag.product and Order.product hold the
-- product slug as plain text with no foreign key, so renaming a product means
-- moving all three tables together or the history starts pointing at nothing.

-- 1. vehicle-tag becomes car-tag. It has real tags and a paid order behind it,
--    so it is renamed rather than replaced — dropping it would orphan them.
UPDATE "products"
   SET "slug" = 'car-tag',
       "name" = 'Car Tag',
       "description" = 'A tag for your car. Anyone who scans it can reach you without seeing your number.'
 WHERE "slug" = 'vehicle-tag';

UPDATE "tags"   SET "product" = 'car-tag' WHERE "product" = 'vehicle-tag';
UPDATE "orders" SET "product" = 'car-tag' WHERE "product" = 'vehicle-tag';

-- 2. Bike Tag is new. ON CONFLICT so re-running (or a database that already has
--    it from the seed) is a no-op.
INSERT INTO "products" ("slug", "name", "description", "pricePaise", "sortOrder", "active", "createdAt", "updatedAt")
VALUES ('bike-tag', 'Bike Tag',
        'A tag for your bike or scooter. Same private call and message, smaller sticker.',
        19900, 2, true, NOW(), NOW())
ON CONFLICT ("slug") DO NOTHING;

-- 3. Business Card and Door Tag were never sold, so they are deleted outright.
--    The guards make this refuse rather than orphan anything if that is ever
--    untrue on some other database — retire those by hand instead.
DELETE FROM "products" p
 WHERE p."slug" IN ('business-card', 'door-tag')
   AND NOT EXISTS (SELECT 1 FROM "tags"   t WHERE t."product" = p."slug")
   AND NOT EXISTS (SELECT 1 FROM "orders" o WHERE o."product" = p."slug");

-- 4. Keep the ordering tidy: Car, Bike, then Free.
UPDATE "products" SET "sortOrder" = 1 WHERE "slug" = 'car-tag';
UPDATE "products" SET "sortOrder" = 2 WHERE "slug" = 'bike-tag';
UPDATE "products" SET "sortOrder" = 3 WHERE "slug" = 'free-etag';
