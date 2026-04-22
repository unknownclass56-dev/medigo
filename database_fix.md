# Fix Medicine Images

The medicine images are currently not displaying because they are being uploaded to the private `kyc-docs` bucket, which prevents customers from viewing them on the landing page. Furthermore, the upload itself was failing because the security policy for `kyc-docs` requires the upload folder to match the user's ID, which wasn't the case for medicines.

To fix this properly, I have updated the code to upload medicine images to a new public bucket called `medicines`.

### Action Required

Please run the following SQL snippet in your **Supabase SQL Editor** to create the new bucket and allow images to be uploaded and viewed:

```sql
-- 1. Create a new public bucket for medicines
INSERT INTO storage.buckets (id, name, public) 
VALUES ('medicines', 'medicines', true) 
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Allow anyone to view medicine images
DROP POLICY IF EXISTS "Anyone can view medicines" ON storage.objects;
CREATE POLICY "Anyone can view medicines" ON storage.objects FOR SELECT
USING (bucket_id = 'medicines');

-- 3. Allow pharmacy owners to upload images
DROP POLICY IF EXISTS "Pharmacy owners can upload medicines" ON storage.objects;
CREATE POLICY "Pharmacy owners can upload medicines" ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'medicines' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'pharmacy_owner'
  )
);

-- 4. Allow pharmacy owners to update their images
DROP POLICY IF EXISTS "Pharmacy owners can update medicines" ON storage.objects;
CREATE POLICY "Pharmacy owners can update medicines" ON storage.objects FOR UPDATE
USING (
  bucket_id = 'medicines' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'pharmacy_owner'
  )
);
```

After running this snippet, go back to your Pharmacy Admin Panel and re-upload the medicine image. It should successfully upload and immediately display on the homepage for all customers!
