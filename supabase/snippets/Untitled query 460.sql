-- Function exists?
SELECT proname FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'match_rag_items';

-- Table + enum exist?
SELECT to_regclass('public.rag_items'),
       to_regtype('public.rag_source_type');

-- Reload PostgREST cache
NOTIFY pgrst, 'reload schema';
