import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getSessionCarpenter } from "@/lib/carpenter-auth";

export async function GET(req: NextRequest) {
  try {
    // Same gate as the rest of /api/carpenter: signed-in carpenters only
    const carpenter = await getSessionCarpenter();
    if (!carpenter) {
      return NextResponse.json({ error: "חייב להיות מחובר" }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const productId = req.nextUrl.searchParams.get("product_id");

    if (!productId) {
      return NextResponse.json(
        { error: "product_id is required" },
        { status: 400 }
      );
    }

    // Fetch all documents for this product
    const { data: documents, error } = await supabase
      .from("product_documents")
      .select("id, title_he, doc_type, file_url, extracted_text, uploaded_at")
      .eq("product_id", productId)
      .order("uploaded_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "Failed to retrieve documents" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      product_id: productId,
      documents: documents || [],
      count: documents?.length || 0,
    });
  } catch (err) {
    console.error("Retrieval error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
