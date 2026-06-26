-- Migration: Add file comments system
-- Date: 2026-02-04
-- Description: Creates table for file-scoped comments with RLS policies

-- Create file_comments table
CREATE TABLE IF NOT EXISTS file_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  comment TEXT NOT NULL CHECK (char_length(comment) <= 1000 AND char_length(comment) > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_file_comments_file_id ON file_comments(file_id);
CREATE INDEX IF NOT EXISTS idx_file_comments_created_at ON file_comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_file_comments_user_id ON file_comments(user_id);

-- Enable Row Level Security
ALTER TABLE file_comments ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone authenticated can view comments
CREATE POLICY "Anyone can view comments"
  ON file_comments
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert comments
CREATE POLICY "Authenticated users can insert comments"
  ON file_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own comments
CREATE POLICY "Users can update own comments"
  ON file_comments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own comments
CREATE POLICY "Users can delete own comments"
  ON file_comments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Admins can delete any comment
CREATE POLICY "Admins can delete any comment"
  ON file_comments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_file_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER trigger_update_file_comments_updated_at
  BEFORE UPDATE ON file_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_file_comments_updated_at();
