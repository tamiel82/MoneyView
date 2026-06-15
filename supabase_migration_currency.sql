-- 1. Add the currency column to the holdings table
ALTER TABLE holdings ADD COLUMN currency VARCHAR(10);

-- 2. Update currency to 'USD' for account 1 (현주주식) and 2 (동민주식)
UPDATE holdings SET currency = 'USD' WHERE account_id IN (1, 2);

-- 3. Update currency to 'KRW' for account 3 (현주절세), 4 (동민절세), and 5 (동민코인)
UPDATE holdings SET currency = 'KRW' WHERE account_id IN (3, 4, 5);
