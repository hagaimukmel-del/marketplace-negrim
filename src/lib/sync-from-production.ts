/**
 * Sync suppliers and products from production nagarimb2b to staging Nagarim
 * Run: npx ts-node src/lib/sync-from-production.ts
 */

import { createClient } from "@supabase/supabase-js";

const PRODUCTION_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ihburmhtcfhwlairyfyf.supabase.co";
const PRODUCTION_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const STAGING_URL = "https://dyueyfmuhwvpgocbypqz.supabase.co";
const STAGING_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5dWV5Zm11aHd2cGdvY2J5cHF6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTUwOTQ0NSwiZXhwIjoyMTA1MDg1NDQ1fQ.Ntxhv_OH1hvY5mT0YKAqZ2rjZb6ZLmcsca7nH4vcm8o";

const prod = createClient(PRODUCTION_URL, PRODUCTION_KEY);
const staging = createClient(STAGING_URL, STAGING_KEY);

async function syncSuppliers() {
  console.log("📥 Syncing suppliers from production...");

  const { data: prodSuppliers, error: err } = await prod
    .from("suppliers")
    .select("*");

  if (err) {
    console.error("❌ Error reading production suppliers:", err);
    return;
  }

  console.log(`Found ${prodSuppliers?.length || 0} suppliers in production`);

  for (const supplier of prodSuppliers || []) {
    const { error: upsertErr } = await staging
      .from("suppliers")
      .upsert(
        {
          id: supplier.id,
          company_name: supplier.company_name,
          business_id: supplier.business_id,
          contact_name: supplier.contact_name,
          email: supplier.email,
          phone: supplier.phone,
          address: supplier.address,
          city: supplier.city,
          zip_code: supplier.zip_code,
          is_verified: supplier.is_verified,
          rating: supplier.rating,
          created_at: supplier.created_at,
          updated_at: supplier.updated_at,
        },
        { onConflict: "id" }
      );

    if (upsertErr) {
      console.error(`❌ Error syncing supplier ${supplier.id}:`, upsertErr);
    } else {
      console.log(`✅ Synced supplier: ${supplier.company_name}`);
    }
  }
}

async function syncProducts() {
  console.log("\n📥 Syncing products from production...");

  const { data: prodProducts, error: err } = await prod
    .from("products")
    .select("*");

  if (err) {
    console.error("❌ Error reading production products:", err);
    return;
  }

  console.log(`Found ${prodProducts?.length || 0} products in production`);

  for (const product of prodProducts || []) {
    const { error: upsertErr } = await staging
      .from("products")
      .upsert(
        {
          id: product.id,
          name_he: product.name_he,
          base_unit: product.base_unit,
          created_at: product.created_at,
        },
        { onConflict: "id" }
      );

    if (upsertErr) {
      console.error(`❌ Error syncing product ${product.id}:`, upsertErr);
    } else {
      console.log(`✅ Synced product: ${product.name_he}`);
    }
  }
}

async function syncOffers() {
  console.log("\n📥 Syncing supplier_offers from production...");

  const { data: prodOffers, error: err } = await prod
    .from("supplier_offers")
    .select("*");

  if (err) {
    console.error("❌ Error reading production offers:", err);
    return;
  }

  console.log(`Found ${prodOffers?.length || 0} offers in production`);

  for (const offer of prodOffers || []) {
    const { error: upsertErr } = await staging
      .from("supplier_offers")
      .upsert(
        {
          id: offer.id,
          supplier_id: offer.supplier_id,
          product_id: offer.product_id,
          price_excl_vat: offer.price_excl_vat,
          stock_qty: offer.stock_qty,
          lead_time_days: offer.lead_time_days,
          pack_qty: offer.pack_qty,
          pack_label: offer.pack_label,
          min_order_qty: offer.min_order_qty,
          is_active: offer.is_active,
          source: offer.source,
          created_at: offer.created_at,
        },
        { onConflict: "id" }
      );

    if (upsertErr) {
      console.error(`❌ Error syncing offer ${offer.id}:`, upsertErr);
    } else {
      console.log(`✅ Synced offer: ${offer.product_id}`);
    }
  }
}

async function main() {
  console.log("🔄 Starting sync from production to staging...\n");

  try {
    await syncSuppliers();
    await syncProducts();
    await syncOffers();

    console.log("\n✅ Sync complete!");
  } catch (err) {
    console.error("❌ Sync failed:", err);
    process.exit(1);
  }
}

main();
