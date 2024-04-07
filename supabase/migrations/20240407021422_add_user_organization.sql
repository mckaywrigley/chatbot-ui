-- Add user_id column and foreign key to organizations

BEGIN;

-- Step 1: Add the user_id column
ALTER TABLE organizations
ADD COLUMN user_id UUID NOT NULL;

-- Step 2: Establish a default value or populate existing rows with valid user_id values
-- Here you would need to decide how to handle existing rows. For example:
-- UPDATE organizations SET user_id = 'default-uuid-here' WHERE user_id IS NULL;

-- Step 3: Add the UNIQUE constraint
ALTER TABLE organizations
ADD CONSTRAINT unique_user_id UNIQUE (user_id);

-- Step 4: Add the foreign key constraint
ALTER TABLE organizations
ADD CONSTRAINT fk_user_id
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

COMMIT;
