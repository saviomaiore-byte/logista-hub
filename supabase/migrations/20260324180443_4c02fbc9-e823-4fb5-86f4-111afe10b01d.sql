-- Make documentos bucket private
UPDATE storage.buckets SET public = false WHERE id = 'documentos';

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documentos');

-- Allow authenticated users to read files
CREATE POLICY "Authenticated users can read files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'documentos');

-- Allow authenticated users to delete files
CREATE POLICY "Authenticated users can delete files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'documentos');

-- Allow authenticated users to update files
CREATE POLICY "Authenticated users can update files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'documentos');