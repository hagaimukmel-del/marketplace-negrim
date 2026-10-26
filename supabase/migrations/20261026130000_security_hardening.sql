-- Security hardening from the 2026-10-26 audit. No data changes.

-- 1. Pin search_path on the three trigger functions the Supabase linter flags
--    (0011_function_search_path_mutable), so a schema earlier on the path can
--    never shadow what they call.
alter function public.order_status_timestamps() set search_path = public, pg_temp;
alter function public.update_updated_at() set search_path = public, pg_temp;
alter function public.order_item_matches_order_supplier() set search_path = public, pg_temp;

-- 2. TRUNCATE is not covered by row level security. The API cannot issue it
--    today, but no browser role has any reason to hold it on any table.
revoke truncate on all tables in schema public from anon, authenticated;
alter default privileges in schema public revoke truncate on tables from anon, authenticated;

-- 3. The public product_documents bucket had no size or type limit. Uploads go
--    through server routes that already allow only PDF/JPEG/PNG up to 20 MB;
--    the bucket now enforces the same.
update storage.buckets
set file_size_limit = 20 * 1024 * 1024,
    allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png']
where id = 'product_documents';
