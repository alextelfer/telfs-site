-- Migration to add admin delete policies
-- Run this in your Supabase SQL editor to enable admins to delete any file or folder

-- Add admin delete policy for files
CREATE POLICY IF NOT EXISTS "Admins can delete any file"
  ON files FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Add admin delete policy for folders
CREATE POLICY IF NOT EXISTS "Admins can delete any folder"
  ON folders FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );
