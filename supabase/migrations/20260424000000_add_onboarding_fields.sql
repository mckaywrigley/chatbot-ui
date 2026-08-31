ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS role TEXT
    CHECK (role IN ('researcher','scientist','student','pm','other')),
  ADD COLUMN IF NOT EXISTS research_field TEXT
    CHECK (char_length(research_field) <= 100),
  ADD COLUMN IF NOT EXISTS use_case TEXT
    CHECK (use_case IN ('design','validate','explore','browse')),
  ADD COLUMN IF NOT EXISTS onboarding_step SMALLINT NOT NULL DEFAULT 0
    CHECK (onboarding_step >= 0 AND onboarding_step <= 2);
