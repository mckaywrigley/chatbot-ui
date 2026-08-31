--------------- REPORTS ---------------

-- TABLE --

CREATE TABLE IF NOT EXISTS reports (
    -- ID
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- REQUIRED RELATIONSHIPS
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- OPTIONAL RELATIONSHIPS
    folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,

    -- METADATA
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ,

    -- SHARING
    sharing TEXT NOT NULL DEFAULT 'private',

    -- REQUIRED
    name TEXT NOT NULL CHECK (char_length(name) <= 100),
    description TEXT NOT NULL CHECK (char_length(description) <= 500)
);

-- INDEXES --

CREATE INDEX reports_user_id_idx ON reports(user_id);

-- RLS --

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to own reports"
    ON reports
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Allow view access to non-private reports"
    ON reports
    FOR SELECT
    USING (sharing <> 'private');

-- TRIGGERS --

CREATE TRIGGER update_reports_updated_at
BEFORE UPDATE ON reports
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

--------------- REPORT FILES ---------------

-- TABLE --

CREATE TABLE IF NOT EXISTS report_files (
    -- REQUIRED RELATIONSHIPS
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    file_type TEXT NOT NULL CHECK (file_type IN ('protocol', 'papers', 'dataFiles')),

    PRIMARY KEY(report_id, file_id),

    -- METADATA
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ
);

-- INDEXES --

CREATE INDEX report_files_user_id_idx ON report_files(user_id);
CREATE INDEX report_files_report_id_idx ON report_files(report_id);
CREATE INDEX report_files_file_id_idx ON report_files(file_id);

-- RLS --

ALTER TABLE report_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to own report_files"
    ON report_files
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- TRIGGERS --

CREATE TRIGGER update_report_files_updated_at
BEFORE UPDATE ON report_files 
FOR EACH ROW 
EXECUTE PROCEDURE update_updated_at_column();

--------------- REPORT COLLECTIONS ---------------

-- TABLE --

CREATE TABLE IF NOT EXISTS report_collections (
    -- REQUIRED RELATIONSHIPS
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,

    PRIMARY KEY(report_id, collection_id),

    -- METADATA
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ
);

-- INDEXES --

CREATE INDEX report_collections_user_id_idx ON report_collections(user_id);
CREATE INDEX report_collections_report_id_idx ON report_collections(report_id);
CREATE INDEX report_collections_collection_id_idx ON report_collections(collection_id);

-- RLS --

ALTER TABLE report_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to own report_collections"
    ON report_collections
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- TRIGGERS --

CREATE TRIGGER update_report_collections_updated_at
BEFORE UPDATE ON report_collections 
FOR EACH ROW 
EXECUTE PROCEDURE update_updated_at_column();

--------------- REPORT WORKSPACES ---------------

-- TABLE --

CREATE TABLE IF NOT EXISTS report_workspaces (
    -- REQUIRED RELATIONSHIPS
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

    PRIMARY KEY(report_id, workspace_id),

    -- METADATA
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ
);

-- INDEXES --

CREATE INDEX report_workspaces_user_id_idx ON report_workspaces(user_id);
CREATE INDEX report_workspaces_report_id_idx ON report_workspaces(report_id);
CREATE INDEX report_workspaces_workspace_id_idx ON report_workspaces(workspace_id);

-- RLS --

ALTER TABLE report_workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to own report_workspaces"
    ON report_workspaces
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- TRIGGERS --

CREATE TRIGGER update_report_workspaces_updated_at
BEFORE UPDATE ON report_workspaces 
FOR EACH ROW 
EXECUTE PROCEDURE update_updated_at_column();