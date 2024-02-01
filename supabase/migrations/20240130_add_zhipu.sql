ALTER TABLE profiles
ADD COLUMN zhipu_api_key TEXT CHECK (char_length(zhipu_api_key) <= 1000);