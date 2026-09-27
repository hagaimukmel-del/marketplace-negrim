-- Product Technical Documents
-- Each product can have multiple documents (specs, usage, images, etc)

CREATE TABLE IF NOT EXISTS public.product_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products (id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers (id) ON DELETE CASCADE,

  -- Document metadata
  title_he VARCHAR NOT NULL,
  doc_type VARCHAR NOT NULL CHECK (doc_type IN ('spec_sheet', 'usage_guide', 'image', 'datasheet', 'other')),

  -- Storage
  file_url TEXT NOT NULL,
  file_name VARCHAR NOT NULL,
  file_size_kb INTEGER,
  content_type VARCHAR,

  -- Content for retrieval
  extracted_text TEXT,

  -- Tracking
  uploaded_by UUID REFERENCES auth.users (id),
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_product_documents_product_id
  ON public.product_documents (product_id);
CREATE INDEX IF NOT EXISTS idx_product_documents_supplier_id
  ON public.product_documents (supplier_id);
