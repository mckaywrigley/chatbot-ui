ALTER TABLE profiles ADD COLUMN together_api_key TEXT CHECK (char_length(together_api_key) <= 1000);
