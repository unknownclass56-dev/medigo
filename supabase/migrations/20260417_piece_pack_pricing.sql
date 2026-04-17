-- Add piece/pack pricing to pharmacy_inventory
ALTER TABLE pharmacy_inventory
ADD COLUMN IF NOT EXISTS price_per_piece  numeric          DEFAULT NULL,
ADD COLUMN IF NOT EXISTS price_per_pack   numeric          DEFAULT NULL,
ADD COLUMN IF NOT EXISTS pieces_per_pack  integer          DEFAULT 10;

-- Back-fill existing rows: treat current price as price_per_piece
UPDATE pharmacy_inventory
SET price_per_piece = price
WHERE price_per_piece IS NULL;
