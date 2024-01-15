ALTER TABLE profiles
ADD COLUMN openrouter_api_key TEXT CHECK (char_length(openrouter_api_key) <= 1000);
