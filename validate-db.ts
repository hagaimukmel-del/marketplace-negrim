import { createClient } from "@supabase/supabase-js";

// Never paste a key here: this repo is public. Set them in the shell, e.g. from .env.staging.local
const STAGING_URL = process.env.STAGING_SUPABASE_URL || "https://dyueyfmuhwvpgocbypqz.supabase.co";
const STAGING_KEY = process.env.STAGING_SERVICE_ROLE_KEY;
if (!STAGING_KEY) {
  throw new Error("Set STAGING_SERVICE_ROLE_KEY (see .env.staging.local)");
}

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
