-- Migration: Add 'banco' column to cotizaciones table
-- Purpose: Store banking information (bank name) for quotations
-- Status: Required for persisting banco field in quotation form

ALTER TABLE cotizaciones
ADD COLUMN IF NOT EXISTS banco TEXT;

-- Verify the column was added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'cotizaciones'
AND column_name = 'banco';
