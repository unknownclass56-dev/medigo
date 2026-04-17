-- Pharmacy KYC fields
ALTER TABLE public.pharmacies
  ADD COLUMN IF NOT EXISTS gst_no text,
  ADD COLUMN IF NOT EXISTS owner_aadhaar text,
  ADD COLUMN IF NOT EXISTS shop_photo_path text,
  ADD COLUMN IF NOT EXISTS kyc_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS kyc_submitted_at timestamptz;

-- Delivery KYC fields
ALTER TABLE public.delivery_partners
  ADD COLUMN IF NOT EXISTS aadhaar_no text,
  ADD COLUMN IF NOT EXISTS pan_no text,
  ADD COLUMN IF NOT EXISTS driving_license_no text,
  ADD COLUMN IF NOT EXISTS vehicle_rc_no text,
  ADD COLUMN IF NOT EXISTS selfie_path text,
  ADD COLUMN IF NOT EXISTS aadhaar_path text,
  ADD COLUMN IF NOT EXISTS pan_path text,
  ADD COLUMN IF NOT EXISTS dl_path text,
  ADD COLUMN IF NOT EXISTS rc_path text,
  ADD COLUMN IF NOT EXISTS kyc_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS kyc_submitted_at timestamptz;

-- Add 'pay_on_delivery' to payment_method enum (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'payment_method' AND e.enumlabel = 'pay_on_delivery'
  ) THEN
    ALTER TYPE public.payment_method ADD VALUE 'pay_on_delivery';
  END IF;
END$$;

-- KYC docs bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('kyc-docs', 'kyc-docs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for kyc-docs
DROP POLICY IF EXISTS "KYC owner read" ON storage.objects;
CREATE POLICY "KYC owner read" ON storage.objects FOR SELECT
USING (bucket_id = 'kyc-docs' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin')));

DROP POLICY IF EXISTS "KYC owner insert" ON storage.objects;
CREATE POLICY "KYC owner insert" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'kyc-docs' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "KYC owner update" ON storage.objects;
CREATE POLICY "KYC owner update" ON storage.objects FOR UPDATE
USING (bucket_id = 'kyc-docs' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "KYC owner delete" ON storage.objects;
CREATE POLICY "KYC owner delete" ON storage.objects FOR DELETE
USING (bucket_id = 'kyc-docs' AND auth.uid()::text = (storage.foldername(name))[1]);