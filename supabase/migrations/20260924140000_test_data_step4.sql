-- Test data for Step 4: Live Procurement Data
-- This migration adds sample products, offers, and specs for testing

-- 1. Insert test supplier
INSERT INTO public.suppliers (company_name, business_id, status, source, token, phone, email)
VALUES (
  'ספק בדיקה — איתמיר',
  'test-business-001',
  'approved',
  'self',
  'test-token-' || substr(md5(random()::text), 1, 16),
  '052-1234567',
  'test@supplier.example.com'
)
ON CONFLICT DO NOTHING;

-- 2. Get supplier ID for use in subsequent inserts
-- (In actual migration, use explicit ID or dynamic lookup)

-- 3. Insert test products
INSERT INTO public.products (name_he, name_en, description_he, base_unit)
VALUES
  ('דבק Jowat 258.60', 'Jowat 258.60 Adhesive', 'דבק מיוחד להדבקת בירץ וחומרים דומים', 'kg'),
  ('דבק Titebond Ultimate', 'Titebond Ultimate III', 'דבק אוניברסלי עמיד למים', 'liter'),
  ('דבק PVA — סימורו', 'Simoro PVA Adhesive', 'דבק לחיתוך וציפוי', 'liter')
ON CONFLICT DO NOTHING;

-- 4. Insert product specifications (verified)
INSERT INTO public.product_specifications (product_id, spec_key, spec_value, spec_unit, is_verified)
SELECT
  p.id,
  'material',
  'birch',
  NULL,
  true
FROM public.products p
WHERE p.name_he IN ('דבק Jowat 258.60', 'דבק Titebond Ultimate')
ON CONFLICT DO NOTHING;

INSERT INTO public.product_specifications (product_id, spec_key, spec_value, spec_unit, is_verified)
SELECT
  p.id,
  'application',
  'bonding wood veneer and solids',
  NULL,
  true
FROM public.products p
WHERE p.name_he = 'דבק Jowat 258.60'
ON CONFLICT DO NOTHING;

INSERT INTO public.product_specifications (product_id, spec_key, spec_value, spec_unit, is_verified)
SELECT
  p.id,
  'curing_time',
  '24',
  'hours',
  true
FROM public.products p
WHERE p.name_he = 'דבק Jowat 258.60'
ON CONFLICT DO NOTHING;

INSERT INTO public.product_specifications (product_id, spec_key, spec_value, spec_unit, is_verified)
SELECT
  p.id,
  'water_resistant',
  'true',
  NULL,
  true
FROM public.products p
WHERE p.name_he = 'דבק Titebond Ultimate'
ON CONFLICT DO NOTHING;

-- 5. Insert supplier offers (live pricing + stock)
INSERT INTO public.supplier_offers (product_id, supplier_id, price_excl_vat, stock_qty, min_order_qty, lead_time_days, is_active, source)
SELECT
  p.id,
  s.id,
  CASE
    WHEN p.name_he = 'דבק Jowat 258.60' THEN 85.00
    WHEN p.name_he = 'דבק Titebond Ultimate' THEN 120.00
    ELSE 65.00
  END,
  CASE
    WHEN p.name_he = 'דבק Jowat 258.60' THEN 12
    WHEN p.name_he = 'דבק Titebond Ultimate' THEN 8
    ELSE 15
  END,
  1,
  1,
  true,
  'manual'
FROM public.products p, public.suppliers s
WHERE p.name_he IN ('דבק Jowat 258.60', 'דבק Titebond Ultimate', 'דבק PVA — סימורו')
  AND s.company_name = 'ספק בדיקה — איתמיר'
ON CONFLICT (product_id, supplier_id) DO NOTHING;
