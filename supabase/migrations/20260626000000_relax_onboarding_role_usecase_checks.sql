-- Onboarding options changed: the role set was replaced (PhD Scholar, Postdoc,
-- Research Scientist, …) and use_case is now a CSV of multiple selections.
-- The original inline CHECK constraints from 20260424 only allowed the old
-- single values, so onboarding now fails with:
--   new row for relation "profiles" violates check constraint "profiles_role_check"
-- (and the use_case check would fail next on the CSV value).
--
-- Role and use_case are validated in the onboarding server action
-- (app/[locale]/onboarding/actions.ts), so the rigid DB checks are redundant -
-- drop them and keep the columns as free text. This also stops the constraint
-- from breaking again the next time the option lists are edited, and lets
-- existing rows with old values be updated without violating.
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_use_case_check;
