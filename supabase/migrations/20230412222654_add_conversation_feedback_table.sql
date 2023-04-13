CREATE TABLE conversation_feedback (
    id SERIAL PRIMARY KEY,
    opinion TEXT,
    conversation JSON NOT NULL,
    positive BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
