import { createClient } from "@supabase/supabase-js";

// Never paste a key here: this repo is public. Set them in the shell, e.g. from .env.staging.local
const STAGING_URL = process.env.STAGING_SUPABASE_URL || "https://dyueyfmuhwvpgocbypqz.supabase.co";
const STAGING_KEY = process.env.STAGING_SERVICE_ROLE_KEY;
if (!STAGING_KEY) {
  throw new Error("Set STAGING_SERVICE_ROLE_KEY (see .env.staging.local)");
}

const staging = createClient(STAGING_URL, STAGING_KEY);

async function insertCarpenter() {
  console.log("📥 Inserting test carpenter...");

  const { data, error } = await staging.from("carpenters").insert({
    business_name: "נגרייה בדיקה",
    token: "test-carpenter-demo",
  });

  if (error) {
    console.error("❌ Error:", error);
    return;
  }

  console.log("✅ Carpenter inserted!");
  console.log("🔗 Use URL:");
  console.log("http://localhost:3000/app/order?token=test-carpenter-demo");
}

insertCarpenter();
