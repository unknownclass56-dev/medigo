
UPDATE storage.buckets SET public = false WHERE id = 'avatars';
DROP POLICY IF EXISTS "Anyone view avatars" ON storage.objects;
CREATE POLICY "Authenticated view avatars" ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');
