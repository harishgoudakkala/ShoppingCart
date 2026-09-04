-- 1Fi SDE1 Assignment - PostgreSQL schema
-- Source-of-truth data is stored here; derived EMI amounts are calculated by the API.

DROP TABLE IF EXISTS emi_plans CASCADE;
DROP TABLE IF EXISTS variant_images CASCADE;
DROP TABLE IF EXISTS variants CASCADE;
DROP TABLE IF EXISTS financing_programs CASCADE;
DROP TABLE IF EXISTS products CASCADE;

CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(120) NOT NULL UNIQUE,
  name VARCHAR(160) NOT NULL,
  badge VARCHAR(80),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE variants (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name VARCHAR(160) NOT NULL,
  color VARCHAR(80) NOT NULL,
  storage VARCHAR(80) NOT NULL,
  mrp_paise BIGINT NOT NULL CHECK (mrp_paise >= 0),
  price_paise BIGINT NOT NULL CHECK (price_paise >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, color, storage)
);

CREATE TABLE variant_images (
  id SERIAL PRIMARY KEY,
  variant_id INTEGER NOT NULL REFERENCES variants(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  UNIQUE (variant_id, sort_order)
);

CREATE TABLE financing_programs (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  provider_type VARCHAR(20) NOT NULL CHECK (provider_type IN ('BANK', 'NBFC', 'PLATFORM')),
  active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE emi_plans (
  id SERIAL PRIMARY KEY,
  variant_id INTEGER NOT NULL REFERENCES variants(id) ON DELETE CASCADE,
  financing_program_id INTEGER NOT NULL REFERENCES financing_programs(id),
  tenure_months INTEGER NOT NULL CHECK (tenure_months > 0),
  interest_rate NUMERIC(5,2) NOT NULL CHECK (interest_rate >= 0),
  cashback_paise BIGINT NOT NULL DEFAULT 0 CHECK (cashback_paise >= 0),
  processing_fee_paise BIGINT NOT NULL DEFAULT 0 CHECK (processing_fee_paise >= 0),
  emi_type VARCHAR(20) NOT NULL CHECK (emi_type IN ('REGULAR', 'NO_COST')),
  label VARCHAR(80) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (variant_id, financing_program_id, tenure_months, interest_rate)
);

CREATE INDEX idx_variants_product_id ON variants(product_id);
CREATE INDEX idx_variant_images_variant_id ON variant_images(variant_id);
CREATE INDEX idx_emi_plans_variant_id ON emi_plans(variant_id);
CREATE INDEX idx_emi_plans_financing_program_id ON emi_plans(financing_program_id);
