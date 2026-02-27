ALTER TABLE profiles ADD COLUMN avian_api_key TEXT CHECK (char_length(avian_api_key) <= 1000);
