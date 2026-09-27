import { createClient } from "@supabase/supabase-js";

const STAGING_URL = "https://dyueyfmuhwvpgocbypqz.supabase.co";
const STAGING_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!STAGING_KEY) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY not set");
  process.exit(1);
}

const staging = createClient(STAGING_URL, STAGING_KEY);

async function createTestCarpenter() {
  console.log("📥 Creating test carpenter...");

  const { data, error } = await staging
    .from("carpenters")
    .insert({
      business_name: "נגרייה בדיקה",
      token: "test-carpenter-agent",
    })
    .select();

  if (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }

  if (data && data[0]) {
    console.log("✅ Test carpenter created!");
    console.log(`ID: ${data[0].id}`);
    console.log(`Token: test-carpenter-agent`);
    console.log(`🔗 URL: http://localhost:3000/app/order?token=test-carpenter-agent`);
  }
}

createTestCarpenter();
