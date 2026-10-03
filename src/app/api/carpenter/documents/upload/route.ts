import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const productId = formData.get("product_id") as string;
    const docType = formData.get("doc_type") as string;
    const carpenterToken = formData.get("token") as string;

    if (!file || !productId || !docType || !carpenterToken) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // 1. Verify carpenter token
    const { data: carpenter } = await supabase
      .from("carpenters")
      .select("id")
      .eq("token", carpenterToken)
      .single();

    if (!carpenter) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Get product to find supplier
    const { data: product } = await supabase
      .from("products")
      .select("id")
      .eq("id", productId)
      .single();

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // 3. Get supplier from offers
    const { data: offer } = await supabase
      .from("supplier_offers")
      .select("supplier_id")
      .eq("product_id", productId)
      .limit(1)
      .single();

    if (!offer) {
      return NextResponse.json(
        { error: "No supplier for this product" },
        { status: 404 }
      );
    }

    // 4. Upload file to Storage
    const fileExt = file.name.split(".").pop();
    const fileName = `${productId}/${Date.now()}.${fileExt}`;
    const buffer = await file.arrayBuffer();

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("product_documents")
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: uploadError.message },
        { status: 500 }
      );
    }

    // 5. Extract text (if PDF) — simplified for now
    let extractedText = "";
    if (file.type === "application/pdf") {
      extractedText = `[PDF: ${file.name}] - Text extraction not yet implemented`;
    } else if (file.type.startsWith("image/")) {
      extractedText = `[Image: ${file.name}] - OCR not yet implemented`;
    }

    // 6. Get public URL
    const { data: publicURL } = supabase.storage
      .from("product_documents")
      .getPublicUrl(fileName);

    // 7. Insert into product_documents
    const { data: doc, error: docError } = await supabase
      .from("product_documents")
      .insert({
        product_id: productId,
        supplier_id: offer.supplier_id,
        title_he: (formData.get("title_he") as string | null) || file.name,
        doc_type: docType,
        file_url: publicURL.publicUrl,
        file_name: file.name,
        file_size_kb: Math.ceil(file.size / 1024),
        content_type: file.type,
        extracted_text: extractedText,
        uploaded_by: carpenter.id,
      })
      .select()
      .single();

    if (docError) {
      return NextResponse.json({ error: docError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      document: {
        id: doc.id,
        file_url: doc.file_url,
        title_he: doc.title_he,
        extracted_text: doc.extracted_text,
      },
    });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
