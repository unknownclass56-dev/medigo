ALTER TABLE platform_config 
ADD COLUMN IF NOT EXISTS banner_title TEXT DEFAULT 'Get your medicines Delivered in 30 Mins.',
ADD COLUMN IF NOT EXISTS banner_subtitle TEXT DEFAULT 'Verified Pharmacies. Trusted Logistics. Best Prices.',
ADD COLUMN IF NOT EXISTS banner_badge TEXT DEFAULT 'FLAT 25% OFF';