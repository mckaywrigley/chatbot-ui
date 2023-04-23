-- Add stripe_subscription_id column to profiles table
ALTER TABLE profiles
ADD COLUMN stripe_subscription_id text;