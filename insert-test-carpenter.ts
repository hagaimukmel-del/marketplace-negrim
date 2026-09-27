import { createClient } from "@supabase/supabase-js";

const STAGING_URL = "https://dyueyfmuhwvpgocbypqz.supabase.co";
const STAGING_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5dWV5Zm11aHd2cGdvY2J5cHF6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTUwOTQ0NSwiZXhwIjoyMTA1MDg1NDQ1fQ.Ntxhv_OH1hvY5mT0YKAqZ2rjZb6ZLmcsca7nH4vcm8o";

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
