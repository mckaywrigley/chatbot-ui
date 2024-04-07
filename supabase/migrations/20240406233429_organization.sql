--------------- ORGANIZATIONS ---------------

-- TABLE --

CREATE TABLE IF NOT EXISTS organizations (
    -- METADATA
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- IDENTIFIERS
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- REQUIRED
    title CHARACTER VARYING NOT NULL CHECK (char_length(title) <= 255),
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,

    -- DATA STRUCTURES
    data JSONB,

    -- REFERENCES TO OTHER DATA
    data_table_id TEXT,
    content_table_id TEXT
);

-- INDEXES --

CREATE INDEX idx_organizations_created_by ON organizations (created_by);

-- RLS --

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to own organizations"
    ON organizations
    USING (created_by = auth.uid())
    WITH CHECK (created_by = auth.uid());
