-- Migration: Fix chat_messages Foreign Key to user_profiles
-- This migration updates the FK relationship to enable embedded joins in PostgREST

-- Step 1: Create user_profiles for any auth.users that don't have one yet
INSERT INTO user_profiles (id, username, display_name)
SELECT 
  au.id,
  COALESCE(split_part(au.email, '@', 1), 'user_' || substr(au.id::text, 1, 8)) as username,
  au.email as display_name
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM user_profiles up WHERE up.id = au.id
)
ON CONFLICT (id) DO NOTHING;

-- Step 2: Drop the existing FK constraint on chat_messages
ALTER TABLE chat_messages 
DROP CONSTRAINT IF EXISTS chat_messages_user_id_fkey;

-- Step 3: Add new FK constraint referencing user_profiles
ALTER TABLE chat_messages
ADD CONSTRAINT chat_messages_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES user_profiles(id) 
ON DELETE CASCADE;

-- Step 4: Create trigger to auto-create user_profiles for new auth.users
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, username, display_name)
  VALUES (
    NEW.id, 
    COALESCE(split_part(NEW.email, '@', 1), 'user_' || substr(NEW.id::text, 1, 8)),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if it exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile();

-- Verification: Check that all chat_messages have valid user_profiles
-- Run this to verify the migration succeeded:
-- SELECT cm.id, cm.user_id, up.username 
-- FROM chat_messages cm
-- LEFT JOIN user_profiles up ON cm.user_id = up.id
-- WHERE up.id IS NULL;
-- (Should return no rows)
