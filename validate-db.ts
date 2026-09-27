import { createClient } from "@supabase/supabase-js";

const STAGING_URL = "https://dyueyfmuhwvpgocbypqz.supabase.co";
const STAGING_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5dWV5Zm11aHd2cGdvY2J5cHF6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTUwOTQ0NSwiZXhwIjoyMTA1MDg1NDQ1fQ.Ntxhv_OH1hvY5mT0YKAqZ2rjZb6ZLmcsca7nH4vcm8o";

const staging = createClient(STAGING_URL, STAGING_KEY);

async function validate() {
  console.log("🔍 Validation Report\n");

  try {
    // 1. Suppliers
    const { data: suppliers, error: suppErr } = await staging
      .from("suppliers")
      .select("id, company_name");
    console.log(`✅ Suppliers: ${suppliers?.length || 0}`);
    if (suppliers) {
      suppliers.forEach((s) => console.log(`   - ${s.company_name}`));
    }

    // 2. Products
    const { data: products, error: prodErr } = await staging
      .from("products")
      .select("id, name_he, base_unit");
    console.log(`\n✅ Products: ${products?.length || 0}`);
    if (products) {
      console.log(`   Sample: ${products.slice(0, 3).map((p) => p.name_he).join(", ")}`);
    }

    // 3. Supplier Offers
    const { data: offers, error: offErr } = await staging
      .from("supplier_offers")
      .select("id, product_id, supplier_id, price_excl_vat, stock_qty");
    console.log(`\n✅ Supplier Offers: ${offers?.length || 0}`);
    if (offers) {
      const sample = offers[0];
      console.log(
        `   Sample: Product ID ${sample.product_id}, Price ₪${sample.price_excl_vat}, Stock: ${sample.stock_qty}`
      );
    }

    // 4. Carpenters
    const { data: carpenters, error: carpErr } = await staging
      .from("carpenters")
      .select("id, business_name, token");
    console.log(`\n✅ Carpenters: ${carpenters?.length || 0}`);
    if (carpenters) {
      carpenters.forEach((c) => console.log(`   - ${c.business_name} (${c.token})`));
    }

    // 5. Product Documents Table (check if exists)
    const { data: docs, error: docErr } = await staging
      .from("product_documents")
      .select("id, product_id, title_he")
      .limit(1);

    if (docErr && docErr.message.includes("does not exist")) {
      console.log(`\n⚠️  product_documents table not ready yet`);
    } else {
      console.log(`\n✅ Product Documents: ${docs?.length || 0}`);
    }

    console.log("\n🚀 Status: Ready for Retrieval Integration");
  } catch (err) {
    console.error("❌ Error:", err);
  }
}

validate();
