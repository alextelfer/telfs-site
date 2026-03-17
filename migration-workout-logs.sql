-- Migration: Add workout logs table
-- Date: 2026-03-16
-- Description: Stores workout set logs per authenticated user with RLS protection

CREATE TABLE IF NOT EXISTS workout_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program TEXT NOT NULL,
  week TEXT NOT NULL,
  day TEXT NOT NULL,
  exercise TEXT NOT NULL,
  set_number INTEGER NOT NULL CHECK (set_number > 0),
  reps INTEGER NOT NULL CHECK (reps > 0),
  weight NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (weight >= 0),
  timer_seconds INTEGER NOT NULL DEFAULT 0 CHECK (timer_seconds >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workout_logs_user_id_created_at
  ON workout_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_workout_logs_user_program_week_day
  ON workout_logs(user_id, program, week, day);

ALTER TABLE workout_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own workout logs" ON workout_logs;
CREATE POLICY "Users can view own workout logs"
  ON workout_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own workout logs" ON workout_logs;
CREATE POLICY "Users can insert own workout logs"
  ON workout_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own workout logs" ON workout_logs;
CREATE POLICY "Users can update own workout logs"
  ON workout_logs
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own workout logs" ON workout_logs;
CREATE POLICY "Users can delete own workout logs"
  ON workout_logs
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all workout logs" ON workout_logs;
CREATE POLICY "Admins can view all workout logs"
  ON workout_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_profiles
      WHERE user_profiles.id = auth.uid() AND user_profiles.is_admin = true
    )
  );

DROP POLICY IF EXISTS "Admins can update all workout logs" ON workout_logs;
CREATE POLICY "Admins can update all workout logs"
  ON workout_logs
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_profiles
      WHERE user_profiles.id = auth.uid() AND user_profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_profiles
      WHERE user_profiles.id = auth.uid() AND user_profiles.is_admin = true
    )
  );

DROP POLICY IF EXISTS "Admins can delete all workout logs" ON workout_logs;
CREATE POLICY "Admins can delete all workout logs"
  ON workout_logs
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_profiles
      WHERE user_profiles.id = auth.uid() AND user_profiles.is_admin = true
    )
  );

CREATE OR REPLACE FUNCTION update_workout_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_workout_logs_updated_at ON workout_logs;
CREATE TRIGGER trigger_update_workout_logs_updated_at
  BEFORE UPDATE ON workout_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_workout_logs_updated_at();