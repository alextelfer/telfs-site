-- Migration: Restrict folder deletes to admins only
-- File deletes remain allowed for owners, with admin override.

DROP POLICY IF EXISTS "Users can delete their own folders" ON folders;
DROP POLICY IF EXISTS "Users can delete their own files" ON files;

DROP POLICY IF EXISTS "Admins can delete any file" ON files;
DROP POLICY IF EXISTS "Admins can delete any folder" ON folders;

CREATE POLICY "Users can delete their own files"
  ON files FOR DELETE
  USING (uploaded_by = auth.uid());

CREATE POLICY "Admins can delete any file"
  ON files FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can delete any folder"
  ON folders FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );
