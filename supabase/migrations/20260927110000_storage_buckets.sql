-- Create storage bucket for product documents

INSERT INTO storage.buckets (id, name, public)
VALUES ('product_documents', 'product_documents', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies: Managed by Supabase dashboard (storage.objects has RLS defaults)
