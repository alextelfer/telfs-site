-- Migration: Add comic reading progress tracking
-- Date: 2026-03-15
-- Description: Stores per-user reading position for comic files

CREATE TABLE IF NOT EXISTS comic_reading_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  page_index INTEGER NOT NULL DEFAULT 0 CHECK (page_index >= 0),
  total_pages INTEGER CHECK (total_pages IS NULL OR total_pages > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, file_id)
);

CREATE INDEX IF NOT EXISTS idx_comic_reading_progress_user_id
  ON comic_reading_progress(user_id);

CREATE INDEX IF NOT EXISTS idx_comic_reading_progress_file_id
  ON comic_reading_progress(file_id);

CREATE INDEX IF NOT EXISTS idx_comic_reading_progress_updated_at
  ON comic_reading_progress(updated_at DESC);

ALTER TABLE comic_reading_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own comic progress" ON comic_reading_progress;
CREATE POLICY "Users can view own comic progress"
  ON comic_reading_progress
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own comic progress" ON comic_reading_progress;
CREATE POLICY "Users can insert own comic progress"
  ON comic_reading_progress
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own comic progress" ON comic_reading_progress;
CREATE POLICY "Users can update own comic progress"
  ON comic_reading_progress
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own comic progress" ON comic_reading_progress;
CREATE POLICY "Users can delete own comic progress"
  ON comic_reading_progress
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all comic progress" ON comic_reading_progress;
CREATE POLICY "Admins can view all comic progress"
  ON comic_reading_progress
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

DROP POLICY IF EXISTS "Admins can update all comic progress" ON comic_reading_progress;
CREATE POLICY "Admins can update all comic progress"
  ON comic_reading_progress
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

DROP POLICY IF EXISTS "Admins can delete all comic progress" ON comic_reading_progress;
CREATE POLICY "Admins can delete all comic progress"
  ON comic_reading_progress
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

DROP TRIGGER IF EXISTS update_comic_reading_progress_updated_at ON comic_reading_progress;
CREATE TRIGGER update_comic_reading_progress_updated_at
  BEFORE UPDATE ON comic_reading_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
