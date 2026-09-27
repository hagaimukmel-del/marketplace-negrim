-- Test carpenter for Agent development

INSERT INTO public.carpenters (business_name, token, created_at)
VALUES (
  'נגרייה בדיקה',
  'test-carpenter-agent',
  now()
) ON CONFLICT DO NOTHING;
