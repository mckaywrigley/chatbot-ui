-- Human-decision log for evaluating generated output.
--
-- WHY THIS EXISTS
--
-- Every AI step in the product ends with a human making a choice: which papers
-- to keep, which hypothesis to carry forward, whether to accept a proposed
-- edit, which simulation suggestions to apply. Those choices are the only
-- ground truth we get for free, and until now they were discarded the moment
-- they were made.
--
-- THE THING THAT MAKES THIS USEFUL: we store what was OFFERED, not just what
-- was chosen. "User selected hypothesis 3" is close to worthless. "We offered
-- five at these ranks, they took the third and rewrote a quarter of it" is an
-- eval datum - it tells you the ranker is mis-ordering AND that the text needed
-- work. A log of accepted items alone can never tell you either, because the
-- refused alternatives are where the signal lives.
--
-- Deliberately NOT Vercel Analytics: track() takes flat scalars, so a candidate
-- set cannot be expressed, rows cannot be joined back to the design, and
-- nothing can be exported for offline analysis. This is queryable data, so it
-- belongs in Postgres.
--
-- Append-only. Writes go through /api/eval under the service role; the client
-- never inserts directly, so a row can never be attributed to another user.

CREATE TABLE IF NOT EXISTS eval_decisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,

  -- WHERE the decision happened. One value per decision point in the product,
  -- so a query can ask "how are hypotheses doing" without parsing JSON.
  surface TEXT NOT NULL CHECK (surface IN (
    'literature',          -- which retrieved papers were kept
    'hypotheses',          -- which generated hypothesis was carried forward
    'hypothesis_own',      -- the researcher wrote their own instead
    'clarify',             -- clarifying questions: answered vs skipped
    'design_section',      -- a generated section was edited by hand
    'design_patch',        -- a chat-proposed edit was approved or dismissed
    'design_regenerate',   -- the whole design was regenerated
    'simulation_changes',  -- which suggested optimisations were applied
    'assumptions',         -- an assumed value was accepted or corrected
    'report_section',      -- a report section was edited or regenerated
    'report_chart',        -- a chart was regenerated or its datasets changed
    'rating'               -- an explicit star / thumb rating
  )),

  -- WHAT the human did. The middle value is the one that matters most:
  -- "approved, but only after rewriting it" is a different quality signal from
  -- "approved as-is", and collapsing them loses exactly what we want to measure.
  decision TEXT NOT NULL CHECK (decision IN (
    'selected',
    'rejected',
    'approved_as_is',
    'approved_with_edits',
    'regenerated',
    'skipped',
    'rated'
  )),

  -- WHAT it was about. Firestore ids are strings, hence TEXT.
  subject_type TEXT CHECK (subject_type IN ('design', 'report')),
  subject_id   TEXT,
  -- Section heading, hypothesis id, clarify question id - whatever identifies
  -- the individual item inside the subject.
  item_key     TEXT,

  -- The counterfactual. `candidates` holds the full offered set with each
  -- item's rank, a truncated label, and whether it was chosen, so a later
  -- analysis can ask "what rank does the human actually pick?" - the single
  -- most useful question about a ranker.
  offered_count INT CHECK (offered_count >= 0),
  chosen_count  INT CHECK (chosen_count  >= 0),
  candidates    JSONB,

  -- How much the human had to change an accepted output. 0 means they took it
  -- verbatim; 1 means they replaced it wholesale. This is a continuous quality
  -- measure that costs nothing to collect, because both versions are in hand
  -- at the moment of the edit.
  edited_ratio REAL CHECK (edited_ratio >= 0 AND edited_ratio <= 1),

  -- Explicit feedback, when we ask for it.
  rating        SMALLINT CHECK (rating BETWEEN 1 AND 5),
  feedback_text TEXT,

  -- Free-form provenance: model, effort level, design version, round number.
  -- Kept as JSON so adding a dimension never needs a migration; promote a key
  -- to a real column once you find yourself grouping by it constantly.
  meta JSONB NOT NULL DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The three access patterns: "how is surface X doing over time", "everything
-- that happened to this design", and per-user rollups.
CREATE INDEX IF NOT EXISTS eval_decisions_surface_created_idx
  ON eval_decisions (surface, created_at DESC);
CREATE INDEX IF NOT EXISTS eval_decisions_subject_idx
  ON eval_decisions (subject_type, subject_id);
CREATE INDEX IF NOT EXISTS eval_decisions_user_created_idx
  ON eval_decisions (user_id, created_at DESC);

-- RLS: a researcher may read their own decisions (so we can show them their
-- own history later). No client writes at all - every insert goes through the
-- service role in /api/eval, which is what makes the user_id trustworthy.
ALTER TABLE eval_decisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "eval_decisions_select_own" ON eval_decisions;
CREATE POLICY "eval_decisions_select_own"
  ON eval_decisions FOR SELECT
  USING (auth.uid() = user_id);
