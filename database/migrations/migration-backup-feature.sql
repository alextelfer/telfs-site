-- Personal backup feature: per-user photo/file backup, gated by a flag on user_profiles.
-- Separate from the shared `files` table used by the pirate hub - backup_files is private per-user.

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS backup_enabled BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS backup_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE backup_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own backup files"
  ON backup_files FOR SELECT
  USING (uploaded_by = auth.uid());

CREATE POLICY "Users can insert their own backup files"
  ON backup_files FOR INSERT
  WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "Users can delete their own backup files"
  ON backup_files FOR DELETE
  USING (uploaded_by = auth.uid());

CREATE POLICY "Admins can view any backup file"
  ON backup_files FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can delete any backup file"
  ON backup_files FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE INDEX IF NOT EXISTS idx_backup_files_uploaded_by ON backup_files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_backup_files_created_at ON backup_files(created_at DESC);
