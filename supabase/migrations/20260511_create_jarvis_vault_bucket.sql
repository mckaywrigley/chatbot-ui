-- Storage bucket for the Jarvis memory vault.
--
-- Each authenticated user gets a prefix `{uid}/...` inside this bucket
-- holding their episode markdown notes + embedding sidecars. The bucket
-- stays PRIVATE - reads/writes go through the service-role server-side
-- pipeline (see lib/jarvis/vault.ts). Per-user isolation is enforced by
-- prefixing on every key + the RLS policies below.

DO $$
BEGIN
  INSERT INTO storage.buckets (id, name)
  VALUES ('jarvis_vault', 'jarvis_vault')
  ON CONFLICT (id) DO NOTHING;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'storage'
      AND table_name = 'buckets'
      AND column_name = 'public'
  ) THEN
    UPDATE storage.buckets SET public = false WHERE id = 'jarvis_vault';
  ELSIF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'storage'
      AND table_name = 'buckets'
      AND column_name = 'is_public'
  ) THEN
    UPDATE storage.buckets SET is_public = false WHERE id = 'jarvis_vault';
  END IF;
END $$;

-- Authenticated users may read + write their own vault prefix. The
-- service role bypasses RLS so the server-side compress pipeline can
-- write episodes asynchronously even when the user's session has
-- already detached (beacon-on-unload pattern).
CREATE POLICY "Jarvis vault: own read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'jarvis_vault' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Jarvis vault: own insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'jarvis_vault' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Jarvis vault: own update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'jarvis_vault' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Jarvis vault: own delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'jarvis_vault' AND (storage.foldername(name))[1] = auth.uid()::text);
