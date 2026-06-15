-- Supabase Migration Schema for MoneyView Portfolio (v4)
-- Adds sub_account and row_index to holdings table for Google Sheets two-way sync

ALTER TABLE holdings 
ADD COLUMN IF NOT EXISTS sub_account TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS row_index INTEGER DEFAULT 0;
