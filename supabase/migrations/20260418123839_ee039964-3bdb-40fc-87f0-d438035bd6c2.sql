
-- Add missing columns to platform_config
ALTER TABLE public.platform_config 
  ADD COLUMN IF NOT EXISTS service_charge numeric NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS banner_title TEXT DEFAULT 'Get your medicines Delivered in 30 Mins.',
  ADD COLUMN IF NOT EXISTS banner_subtitle TEXT DEFAULT 'Verified Pharmacies. Trusted Logistics. Best Prices.',
  ADD COLUMN IF NOT EXISTS banner_badge TEXT DEFAULT 'FLAT 25% OFF';

-- Add settlements columns to orders
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS commission_amount NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pharmacy_settlement_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS dp_settlement_status TEXT DEFAULT 'pending';

-- Add bank details to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS bank_name TEXT,
  ADD COLUMN IF NOT EXISTS account_number TEXT,
  ADD COLUMN IF NOT EXISTS ifsc_code TEXT;
