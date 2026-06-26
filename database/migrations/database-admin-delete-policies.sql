-- Migration to add admin delete policies
-- Run this in your Supabase SQL editor to enable admins to delete any file or folder

-- Keep owner-delete on files; remove owner-delete on folders only
DROP POLICY IF EXISTS "Users can delete their own folders" ON folders;

-- Recreate admin delete policies safely
DROP POLICY IF EXISTS "Admins can delete any file" ON files;
DROP POLICY IF EXISTS "Admins can delete any folder" ON folders;

-- Ensure file owners can still delete their own files
CREATE POLICY IF NOT EXISTS "Users can delete their own files"
  ON files FOR DELETE
  USING (uploaded_by = auth.uid());

-- Add admin delete policy for files
CREATE POLICY "Admins can delete any file"
  ON files FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Add admin delete policy for folders
CREATE POLICY "Admins can delete any folder"
  ON folders FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );
