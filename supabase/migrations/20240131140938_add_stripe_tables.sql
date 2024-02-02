CREATE TABLE IF NOT EXISTS subscriptions (
    -- ID
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subscription_id TEXT NOT NULL CHECK (char_length(subscription_id) <= 1000),

    -- RELATIONSHIPS
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    customer_id TEXT NOT NULL CHECK (char_length(customer_id) <= 1000),

    -- METADATA
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ,

    -- REQUIRED
    status TEXT NOT NULL CHECK (char_length(status) <= 1000),
    start_date TIMESTAMPTZ NULL,
    cancel_at TIMESTAMPTZ NULL,
    canceled_at TIMESTAMPTZ NULL,
    ended_at TIMESTAMPTZ NULL,

    --- UNIQUE subscription_id
    UNIQUE (subscription_id)
);

-- INDEXES --

CREATE INDEX subscriptions_customer_id_idx ON subscriptions(customer_id);

-- RLS --

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to own subscriptions"
    ON subscriptions
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
