-- Create ELN connections table for storing user's ELN integrations

CREATE TABLE IF NOT EXISTS eln_connections (
    -- ID
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- REQUIRED RELATIONSHIPS  
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- ELN CONNECTION DATA
    provider TEXT NOT NULL CHECK (provider IN ('scinote', 'benchling', 'elabnext')),
    access_token_encrypted TEXT NOT NULL,
    tenant_url TEXT, -- For Benchling and other multi-tenant ELNs
    display_name TEXT,

    -- METADATA
    connected_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ,

    -- Constraints
    UNIQUE(user_id, provider, tenant_url)
);

-- INDEXES --

CREATE INDEX eln_connections_user_id_idx ON eln_connections(user_id);
CREATE INDEX eln_connections_provider_idx ON eln_connections(provider);

-- RLS (Row Level Security) --

ALTER TABLE eln_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to own eln connections"
    ON eln_connections
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- TRIGGERS --

CREATE TRIGGER update_eln_connections_updated_at
    BEFORE UPDATE ON eln_connections
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- COMMENTS --

COMMENT ON TABLE eln_connections IS 'Stores encrypted ELN connection credentials for users';
COMMENT ON COLUMN eln_connections.access_token_encrypted IS 'Encrypted API key/token for ELN access';
COMMENT ON COLUMN eln_connections.tenant_url IS 'Base URL for multi-tenant ELNs like Benchling';
COMMENT ON COLUMN eln_connections.display_name IS 'User-friendly name for this connection';