CREATE TABLE IF NOT EXISTS feedback (

    -- RELATIONSHIPS
    message_id UUID PRIMARY KEY,
    chat_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id),

    -- METADATA
    sequence_number INT NOT NULL,
    feedback TEXT NOT NULL CHECK (feedback IN ('good', 'bad')),
    reason VARCHAR(255),
    detailed_feedback TEXT,
    allow_sharing BOOLEAN DEFAULT false,
    allow_email BOOLEAN DEFAULT false,
    model VARCHAR(255),
    plugin VARCHAR(255),
    has_files BOOLEAN DEFAULT false,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ,

    -- INDEXES
    CONSTRAINT fk_message
        FOREIGN KEY(message_id) 
        REFERENCES messages(id)
        ON DELETE NO ACTION
);

-- RLS --
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to own feedback"
    ON feedback
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
