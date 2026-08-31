--------------- DESIGN DRAFT PERSISTENCE ---------------

-- Research plans
CREATE TABLE IF NOT EXISTS design_research_plans (
    plan_id UUID PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL,
    constraints JSONB DEFAULT '{}'::jsonb,
    preferences JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS design_research_plans_status_idx
    ON design_research_plans(status);

ALTER TABLE design_research_plans
    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "design_research_plans_service_role_only"
    ON design_research_plans
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER design_research_plans_set_updated_at
    BEFORE UPDATE ON design_research_plans
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();


-- Hypotheses
CREATE TABLE IF NOT EXISTS design_hypotheses (
    hypothesis_id UUID PRIMARY KEY,
    plan_id UUID NOT NULL REFERENCES design_research_plans(plan_id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    explanation TEXT,
    elo NUMERIC,
    provenance JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS design_hypotheses_plan_id_idx
    ON design_hypotheses(plan_id);

ALTER TABLE design_hypotheses
    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "design_hypotheses_service_role_only"
    ON design_hypotheses
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');


-- Tournament matches
CREATE TABLE IF NOT EXISTS design_tournament_matches (
    match_id UUID PRIMARY KEY,
    plan_id UUID NOT NULL REFERENCES design_research_plans(plan_id) ON DELETE CASCADE,
    challenger_hypothesis_id UUID,
    defender_hypothesis_id UUID,
    winner_hypothesis_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS design_tournament_matches_plan_id_idx
    ON design_tournament_matches(plan_id);

ALTER TABLE design_tournament_matches
    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "design_tournament_matches_service_role_only"
    ON design_tournament_matches
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');


-- Logs
CREATE TABLE IF NOT EXISTS design_logs (
    id BIGSERIAL PRIMARY KEY,
    plan_id UUID NOT NULL REFERENCES design_research_plans(plan_id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL,
    actor TEXT NOT NULL,
    level TEXT NOT NULL,
    message TEXT NOT NULL,
    context JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS design_logs_plan_id_idx
    ON design_logs(plan_id, timestamp DESC);

ALTER TABLE design_logs
    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "design_logs_service_role_only"
    ON design_logs
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

