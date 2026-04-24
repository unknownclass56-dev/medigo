-- Add agreement tracking columns to pharmacies table
ALTER TABLE public.pharmacies 
ADD COLUMN IF NOT EXISTS agreement_signed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS agreement_signed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS agreement_pdf_path TEXT;

-- Update RLS if needed (owners should be able to read their own agreement info)
-- Existing policies for pharmacies already allow owners to SELECT and UPDATE their own pharmacy record.
