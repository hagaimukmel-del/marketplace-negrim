-- SQL Script to create orders table in Supabase
-- Run this in the Supabase SQL Editor (database.new)
-- Navigate to your Supabase project > SQL Editor > Create a new query > Paste this code > Run

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(255) NOT NULL UNIQUE,
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(20) NOT NULL,
  business_name VARCHAR(255),
  address VARCHAR(255),
  city VARCHAR(100),
  zip_code VARCHAR(10),
  payment_method VARCHAR(50) DEFAULT 'credit_card',
  total_amount DECIMAL(10, 2) NOT NULL,
  items_json JSONB NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

-- Enable RLS (Row Level Security)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to insert orders (public create)
CREATE POLICY "Allow anyone to insert orders"
  ON orders FOR INSERT
  WITH CHECK (true);

-- Create policy to allow anyone to read orders (public read)
CREATE POLICY "Allow anyone to read orders"
  ON orders FOR SELECT
  USING (true);

-- Create policy to allow updates for order status
CREATE POLICY "Allow anyone to update order status"
  ON orders FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Verify the table was created
SELECT * FROM orders LIMIT 0;
