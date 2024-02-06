
-- Fix Policy
DROP POLICY "Allow full access to own subscriptions" ON subscriptions;
CREATE POLICY "Allow readonly access to own subscriptions"
    ON subscriptions
    FOR SELECT
    USING (user_id = auth.uid());
