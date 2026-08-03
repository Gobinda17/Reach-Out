-- A tag that gets posted must have a delivery address. Two kinds of tag are
-- exempt, and only these two: a free tag (the eTag is a PDF — nothing is
-- shipped) and unclaimed blank stock (no owner yet, so no address yet).
--
-- This is a trigger and not a CHECK constraint because whether a tag is free is
-- a fact about the `products` row it points at, and a CHECK cannot read another
-- table. Being a trigger also scopes the rule to rows actually being written:
-- data that predates it is left alone, and re-pricing a product never
-- retroactively invalidates a tag already sold under the old price.
--
-- The application enforces the fuller rule — every part of the address except
-- the landmark, see validateAddress() in lib/customer.js. This is the last line
-- of defence, so it only asks what the database can answer by itself: is there
-- an address at all?

CREATE OR REPLACE FUNCTION tag_requires_delivery_address() RETURNS trigger AS $$
DECLARE
  price INTEGER;
BEGIN
  -- Blank stock: no owner, so there is nothing to post anywhere yet.
  IF NEW."createdById" IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT "pricePaise" INTO price FROM "products" WHERE "slug" = NEW."product";

  -- Free products ship nothing. An unknown slug cannot be priced at all, so
  -- that judgement is left to the application rather than blocking the write.
  IF price IS NULL OR price = 0 THEN
    RETURN NEW;
  END IF;

  -- composeIndianAddress() always emits its four lines, blanks included, so an
  -- untouched form arrives as newlines and separators with nothing between
  -- them — strip those before deciding the address is empty.
  IF NEW."address" IS NULL
     OR regexp_replace(NEW."address", '[[:space:],-]', '', 'g') = '' THEN
    RAISE EXCEPTION 'tag % (product %) needs a delivery address', NEW."code", NEW."product"
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tags_require_delivery_address_insert ON "tags";
CREATE TRIGGER tags_require_delivery_address_insert
  BEFORE INSERT ON "tags"
  FOR EACH ROW
  EXECUTE FUNCTION tag_requires_delivery_address();

-- On update, only when one of the three inputs to the rule actually changes.
-- Everything else that writes a tag row — shippedAt, downloadedAt, seller
-- assignment, an admin editing a phone number — must not trip over a row that
-- predates this migration.
DROP TRIGGER IF EXISTS tags_require_delivery_address_update ON "tags";
CREATE TRIGGER tags_require_delivery_address_update
  BEFORE UPDATE ON "tags"
  FOR EACH ROW
  WHEN (
    OLD."address" IS DISTINCT FROM NEW."address"
    OR OLD."createdById" IS DISTINCT FROM NEW."createdById"
    OR OLD."product" IS DISTINCT FROM NEW."product"
  )
  EXECUTE FUNCTION tag_requires_delivery_address();
