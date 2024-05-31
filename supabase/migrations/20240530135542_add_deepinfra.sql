ALTER TABLE profiles ADD COLUMN deepinfra_api_key TEXT CHECK (char_length(deepinfra_api_key) <= 1000);
