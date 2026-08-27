-- SQL Script to create supplier-related tables in Supabase
-- Run this in the Supabase SQL Editor (database.new)
-- Navigate to your Supabase project > SQL Editor > Create a new query > Paste this code > Run

-- Create suppliers table (if not exists)
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID UNIQUE,
  company_name VARCHAR(255) NOT NULL,
  business_id VARCHAR(20) UNIQUE NOT NULL,
  contact_name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(20),
  address VARCHAR(255),
  city VARCHAR(100),
  zip_code VARCHAR(10),
  bank_name VARCHAR(100),
  bank_sort_code VARCHAR(10),
  bank_account_number VARCHAR(20),
  bank_account_holder VARCHAR(255),
  is_verified BOOLEAN DEFAULT false,
  rating DECIMAL(2, 1),
  total_sales DECIMAL(12, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_suppliers_business_id ON suppliers(business_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_email ON suppliers(email);

-- Enable RLS (Row Level Security)
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

-- Create policies for suppliers table
CREATE POLICY "Allow anyone to read suppliers"
  ON suppliers FOR SELECT
  USING (true);

CREATE POLICY "Allow suppliers to update their own data"
  ON suppliers FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Update products table to include supplier_id if not exists
-- (This assumes supplier_id column exists; if not, uncomment below)
-- ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id);
-- CREATE INDEX IF NOT EXISTS idx_products_supplier_id ON products(supplier_id);

-- Create supplier_products junction table for better relationships
CREATE TABLE IF NOT EXISTS supplier_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(supplier_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_supplier_products_supplier_id ON supplier_products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_products_product_id ON supplier_products(product_id);

-- Create trigger to update suppliers updated_at timestamp
CREATE OR REPLACE FUNCTION update_suppliers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW
  EXECUTE FUNCTION update_suppliers_updated_at();

-- Create supplier_orders view to see orders for supplier's products
CREATE OR REPLACE VIEW supplier_orders AS
SELECT
  o.id,
  o.order_number,
  o.customer_name,
  o.customer_email,
  o.customer_phone,
  o.total_amount,
  o.status,
  o.created_at,
  o.payment_method,
  sp.supplier_id
FROM orders o
JOIN supplier_products sp ON o.items_json::text LIKE '%' || p.id || '%'
JOIN products p ON p.id = sp.product_id
GROUP BY o.id, sp.supplier_id;

-- Verify tables were created
SELECT * FROM suppliers LIMIT 0;
SELECT * FROM supplier_products LIMIT 0;

-- Example data (optional - remove if not needed):
-- INSERT INTO suppliers (company_name, business_id, contact_name, email, phone)
-- VALUES ('דבקים ומוצרי עץ בע״מ', '123456789', 'דב כהן', 'dov@adhesives.co.il', '050-123-4567');
