--------------- ASSISTANT TOOLS ---------------

-- TABLE --

CREATE TABLE IF NOT EXISTS assistant_tools (
    -- REQUIRED RELATIONSHIPS
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    assistant_id UUID NOT NULL REFERENCES assistants(id) ON DELETE CASCADE,
    tool_id UUID NOT NULL REFERENCES tools(id) ON DELETE CASCADE,

    PRIMARY KEY(assistant_id, tool_id),

    -- METADATA
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ
);

-- INDEXES --

CREATE INDEX assistant_tools_user_id_idx ON assistant_tools(user_id);
CREATE INDEX assistant_tools_assistant_id_idx ON assistant_tools(assistant_id);
CREATE INDEX assistant_tools_tool_id_idx ON assistant_tools(tool_id);

-- RLS --

ALTER TABLE assistant_tools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to own assistant_tools"
    ON assistant_tools
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- TRIGGERS --

CREATE TRIGGER update_assistant_tools_updated_at
BEFORE UPDATE ON assistant_tools 
FOR EACH ROW 
EXECUTE PROCEDURE update_updated_at_column();