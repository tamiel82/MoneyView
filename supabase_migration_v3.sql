-- Supabase Migration Schema for MoneyView Portfolio (v3)
-- Adds columns to store the EXACT historical invested amounts from Google Sheets

ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS principal BIGINT DEFAULT 0;

ALTER TABLE holdings 
ADD COLUMN IF NOT EXISTS invested_krw BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS invested_usd NUMERIC DEFAULT 0;
