-- Add service_charge column to platform_config if it doesn't exist
ALTER TABLE platform_config
ADD COLUMN IF NOT EXISTS service_charge numeric NOT NULL DEFAULT 5;
