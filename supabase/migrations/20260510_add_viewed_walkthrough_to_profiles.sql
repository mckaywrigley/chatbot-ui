-- profiles.viewed_walkthrough flips to TRUE the first time a user
-- finishes (or skips) the in-app product tour. Pre-existing rows are
-- backfilled to TRUE so we don't ambush returning users with a tour
-- they didn't ask for - only brand-new signups (where the column
-- defaults to FALSE on insert) see it.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS viewed_walkthrough boolean NOT NULL DEFAULT false;

UPDATE profiles SET viewed_walkthrough = true WHERE has_onboarded = true;
