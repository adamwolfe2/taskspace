-- Migration: Support creating rocks for draft members (uninvited users)
-- This allows creating rocks before a user accepts their invitation
-- Rocks can be assigned via email, then transferred to userId on acceptance

-- Step 1: Make user_id nullable on rocks table
ALTER TABLE rocks
  ALTER COLUMN user_id DROP NOT NULL;

-- Step 2: Add owner_email field for draft member rocks
ALTER TABLE rocks
  ADD COLUMN owner_email VARCHAR(255);

-- Step 3: Add check constraint - must have EITHER user_id OR owner_email (not both, not neither)
ALTER TABLE rocks
  ADD CONSTRAINT rocks_owner_check
  CHECK (
    (user_id IS NOT NULL AND owner_email IS NULL) OR
    (user_id IS NULL AND owner_email IS NOT NULL)
  );

-- Step 4: Create index on owner_email for faster lookups
CREATE INDEX IF NOT EXISTS idx_rocks_owner_email ON rocks(owner_email) WHERE owner_email IS NOT NULL;

-- Step 5: Do the same for tasks table so tasks can be created for draft members
ALTER TABLE tasks
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE tasks
  ADD COLUMN owner_email VARCHAR(255);

ALTER TABLE tasks
  ADD CONSTRAINT tasks_owner_check
  CHECK (
    (user_id IS NOT NULL AND owner_email IS NULL) OR
    (user_id IS NULL AND owner_email IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS idx_tasks_owner_email ON tasks(owner_email) WHERE owner_email IS NOT NULL;

-- Step 6: Create function to transfer pending rocks/tasks when user accepts invitation
CREATE OR REPLACE FUNCTION transfer_pending_items_to_user(
  p_email VARCHAR(255),
  p_user_id VARCHAR(255)
) RETURNS void AS $$
BEGIN
  -- Transfer rocks from email to user_id
  UPDATE rocks
  SET user_id = p_user_id,
      owner_email = NULL,
      updated_at = NOW()
  WHERE owner_email = p_email;

  -- Transfer tasks from email to user_id
  UPDATE tasks
  SET user_id = p_user_id,
      owner_email = NULL,
      updated_at = NOW()
  WHERE owner_email = p_email;
END;
$$ LANGUAGE plpgsql;
