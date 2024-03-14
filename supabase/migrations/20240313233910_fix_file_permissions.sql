CREATE POLICY "Allow user read access to own files"
ON storage.objects FOR SELECT TO authenticated
USING (((bucket_id = 'files'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));