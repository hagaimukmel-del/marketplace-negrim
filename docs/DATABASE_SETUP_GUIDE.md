# Database Setup Guide — Marketplace Negrim

## Overview
This guide walks you through setting up all required Supabase tables for the Marketplace Negrim application.

## Prerequisites
- Supabase account and project created
- Access to Supabase SQL Editor
- Environment variables configured (.env.local)

## Setup Steps

### Step 1: Run Orders Table Schema
**File:** `docs/SETUP_ORDERS_TABLE.sql`

1. Go to your Supabase project dashboard
2. Click **SQL Editor** in the left sidebar
3. Click **Create a new query**
4. Copy and paste the entire contents of `SETUP_ORDERS_TABLE.sql`
5. Click **Run** (or Cmd/Ctrl + Enter)
6. Verify success: You should see no errors, and the table is created

**What it creates:**
- `orders` table with columns: order_number, customer_name, customer_email, customer_phone, business_name, address, city, zip_code, payment_method, total_amount, items_json, status, created_at, updated_at
- RLS policies for public access
- Indexes on customer_email, status, created_at for performance
- Auto-update trigger for updated_at timestamp

---

### Step 2: Run Supplier Tables Schema
**File:** `docs/SETUP_SUPPLIER_TABLES.sql`

1. In the SQL Editor, create a **new query**
2. Copy and paste the entire contents of `SETUP_SUPPLIER_TABLES.sql`
3. Click **Run**
4. Verify success: No errors expected

**What it creates:**
- `suppliers` table: company info, contact, bank details, ratings, sales tracking
- `supplier_products` junction table: links suppliers to their products
- RLS policies for supplier data access
- Indexes for efficient queries
- Auto-update trigger for updated_at timestamp
- View: `supplier_orders` (optional, may need refinement)

---

### Step 3: Verify Tables Created

Run this query in the SQL Editor to verify all tables exist:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

**Expected tables:**
- categories
- orders ✅
- products
- profiles
- supplier_products ✅
- suppliers ✅
- (any other existing tables)

---

## Table Relationships

```
suppliers (1) ──── (many) supplier_products (many) ──── (1) products
                                                              │
                                                              └── orders (via items_json)
```

**Key Relationships:**
- `suppliers.id` → `supplier_products.supplier_id`
- `products.id` → `supplier_products.product_id`
- `orders.items_json` → contains product IDs

---

## API Endpoints

### Orders API
- **POST** `/api/orders` — Create new order
- **GET** `/api/orders` — List orders (with pagination)
- **GET** `/api/orders/[id]` — Get order details
- **PATCH** `/api/orders/[id]` — Update order status

### Suppliers API (To be implemented)
- **GET** `/api/suppliers` — List suppliers
- **POST** `/api/suppliers` — Create supplier
- **GET** `/api/suppliers/[id]` — Get supplier details
- **PATCH** `/api/suppliers/[id]` — Update supplier
- **GET** `/api/suppliers/[id]/products` — Supplier's products
- **GET** `/api/suppliers/[id]/orders` — Supplier's orders

---

## Row Level Security (RLS) Policies

All tables have RLS enabled with policies for:
- **Public Read:** Everyone can view products, suppliers, orders
- **Public Write:** Anyone can insert orders
- **Authenticated Update:** Suppliers can update their own data

### To modify RLS policies:
1. Go to **Authentication** → **Policies** in Supabase
2. Select the table
3. View, edit, or create policies as needed

---

## Security Notes

⚠️ **Important:**
- Bank account details in `suppliers` table should only be accessible by:
  - The supplier themselves (via auth)
  - Admin users
  - Backend services (via service role key)
- Consider adding auth checks before exposing bank data in frontend

✅ **Current Security:**
- RLS prevents unauthenticated users from modifying tables
- Policies allow public reads for catalog/orders
- Updates require proper permissions

---

## Troubleshooting

### Error: "permission denied for schema public"
→ Ensure you're logged into Supabase with a project owner or editor role

### Error: "relation already exists"
→ The table was already created. Skip that SQL or use `DROP TABLE IF EXISTS` first

### Error: "foreign key violation"
→ Referenced table doesn't exist. Run SETUP_ORDERS_TABLE.sql first, then SETUP_SUPPLIER_TABLES.sql

### Orders table exists but products don't load
→ Check if `supplier_products` junction table was created successfully

---

## Next Steps

After running the SQL scripts:

1. **Verify connections:** Test API endpoints at `/api/orders`
2. **Seed demo data:** Add sample products and suppliers
3. **Enable Auth:** Set up authentication for supplier dashboard
4. **Configure RLS:** Tighten policies for production
5. **Implement Analytics:** Add tracking views for supplier metrics

---

## File Reference

| File | Purpose | Status |
|------|---------|--------|
| `SETUP_ORDERS_TABLE.sql` | Orders schema with RLS | ✅ Required |
| `SETUP_SUPPLIER_TABLES.sql` | Supplier & products schema | ✅ Required |
| `DATABASE_SETUP_GUIDE.md` | This file | 📖 Reference |

---

## Questions?

If you encounter issues:
1. Check Supabase logs: **Settings** → **Logs**
2. Verify table creation: Run the verification query above
3. Test API: Use curl or Postman to test `/api/orders`
4. Review RLS policies: **Authentication** → **Policies**

