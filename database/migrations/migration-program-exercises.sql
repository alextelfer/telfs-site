-- Migration: Add program_exercises catalog table + seed ULR 4-Day plan
-- Date: 2026-07-14
-- Description: Stores a shared catalog of program/day/exercise entries so
--   they can be picked from the /workout dropdowns before a set has ever
--   been logged for them. Readable by any authenticated user; writable by
--   admins only. Seeds the "ULR 4-Day" program (Upper A / Lower A / Upper B
--   / Lower B) built from the S-Tier exercise list.

CREATE TABLE IF NOT EXISTS program_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program TEXT NOT NULL,
  day TEXT NOT NULL,
  exercise TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  target_sets INTEGER CHECK (target_sets IS NULL OR target_sets > 0),
  target_reps TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (program, day, exercise)
);

CREATE INDEX IF NOT EXISTS idx_program_exercises_program_day
  ON program_exercises(program, day, sort_order);

ALTER TABLE program_exercises ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view program exercises" ON program_exercises;
CREATE POLICY "Authenticated users can view program exercises"
  ON program_exercises
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can insert program exercises" ON program_exercises;
CREATE POLICY "Admins can insert program exercises"
  ON program_exercises
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

DROP POLICY IF EXISTS "Admins can update program exercises" ON program_exercises;
CREATE POLICY "Admins can update program exercises"
  ON program_exercises
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

DROP POLICY IF EXISTS "Admins can delete program exercises" ON program_exercises;
CREATE POLICY "Admins can delete program exercises"
  ON program_exercises
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

DROP TRIGGER IF EXISTS update_program_exercises_updated_at ON program_exercises;
CREATE TRIGGER update_program_exercises_updated_at
  BEFORE UPDATE ON program_exercises
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Seed: ULR 4-Day program (Upper A / Lower A / Upper B / Lower B)
-- Sourced from the "S-Tier Exercises" list (@trstnn.lifts, TikTok), 2 working
-- sets per exercise. Re-running this migration is safe — ON CONFLICT updates
-- the existing row instead of duplicating it.

INSERT INTO program_exercises (program, day, exercise, sort_order, target_sets, target_reps, notes)
VALUES
  -- Upper A
  ('ULR 4-Day', 'Upper A', 'Flat Press (barbell/DB/machine)', 1, 2, '6-10', 'Mid-pec. Alt: Pec Deck Fly'),
  ('ULR 4-Day', 'Upper A', 'Smith / DB Incline Press', 2, 2, '8-12', 'Upper-pec. Alt: Cable/DB Low-to-High Fly'),
  ('ULR 4-Day', 'Upper A', 'Lat Pulldown', 3, 2, '8-12', 'Lower-lat emphasis. Alt: pull-ups'),
  ('ULR 4-Day', 'Upper A', 'Close-Grip Cable Row', 4, 2, '8-12', 'Upper-lat emphasis'),
  ('ULR 4-Day', 'Upper A', 'Top-Half Shoulder Press', 5, 2, '8-12', 'Front delt. Alt: Cable Front Raise'),
  ('ULR 4-Day', 'Upper A', 'Cable Lateral Raise', 6, 2, '12-15', 'Side delt. Alt: machine lateral raise'),
  ('ULR 4-Day', 'Upper A', 'Cable Curl', 7, 2, '10-12', 'Biceps. Alt: incline/recline curl'),
  ('ULR 4-Day', 'Upper A', 'Overhead Tricep Extension', 8, 2, '10-12', 'Long head — keep upper arm locked in'),
  ('ULR 4-Day', 'Upper A', 'Cable Wrist Curl + Extension', 9, 2, '15-20', 'Forearms — flexors then extensors'),

  -- Lower A
  ('ULR 4-Day', 'Lower A', 'Barbell / Smith Squat', 1, 2, '6-10', 'Quads. Alt: hack squat, pendulum squat'),
  ('ULR 4-Day', 'Lower A', 'Leg Extension', 2, 2, '12-15', 'Quads — pair with squat pattern'),
  ('ULR 4-Day', 'Lower A', 'Seated Leg Curl', 3, 2, '10-12', 'Hamstrings — upper bias'),
  ('ULR 4-Day', 'Lower A', 'Romanian Deadlift', 4, 2, '8-10', 'Hip hinge. Alt: hyperextension, SLDL'),
  ('ULR 4-Day', 'Lower A', 'Hip Thrust', 5, 2, '8-12', 'Glutes'),
  ('ULR 4-Day', 'Lower A', 'Straight-Leg Calf Raise/Press', 6, 2, '10-15', 'Calves'),
  ('ULR 4-Day', 'Lower A', 'Cable Ab Crunch', 7, 2, '12-15', 'Abs'),

  -- Upper B
  ('ULR 4-Day', 'Upper B', 'Pec Deck Fly', 1, 2, '12-15', 'Mid-pec. Alt: flat press'),
  ('ULR 4-Day', 'Upper B', 'Cable/DB Low-to-High Fly', 2, 2, '12-15', 'Upper-pec. Alt: incline press'),
  ('ULR 4-Day', 'Upper B', 'Wide-Grip T-Bar Row', 3, 2, '8-12', 'Traps + rhomboids. Alt: wide-grip bar row'),
  ('ULR 4-Day', 'Upper B', 'Wide-Grip Row, Elbows Flared', 4, 2, '10-12', 'Rear delt (optional slot)'),
  ('ULR 4-Day', 'Upper B', 'Cable Front Raise', 5, 2, '12-15', 'Front delt. Alt: top-half shoulder press'),
  ('ULR 4-Day', 'Upper B', 'Machine Lateral Raise', 6, 2, '12-15', 'Side delt'),
  ('ULR 4-Day', 'Upper B', 'Incline / Recline Curl', 7, 2, '10-12', 'Biceps'),
  ('ULR 4-Day', 'Upper B', 'Dips (or JM Press)', 8, 2, '8-12', 'Medial + lateral tricep head'),
  ('ULR 4-Day', 'Upper B', 'Top-Half Hammer / Reverse Curl', 9, 2, '12-15', 'Brachioradialis'),

  -- Lower B
  ('ULR 4-Day', 'Lower B', 'Leg Press (or Pendulum Squat)', 1, 2, '8-12', 'Quads'),
  ('ULR 4-Day', 'Lower B', 'Leg Extension', 2, 2, '12-15', 'Quads'),
  ('ULR 4-Day', 'Lower B', 'Lying Leg Curl', 3, 2, '10-12', 'Hamstrings — lower bias'),
  ('ULR 4-Day', 'Lower B', 'Hyperextension (or SLDL)', 4, 2, '10-12', 'Hip hinge'),
  ('ULR 4-Day', 'Lower B', 'Hip Thrust', 5, 2, '10-12', 'Glutes'),
  ('ULR 4-Day', 'Lower B', 'Hip Abduction Machine', 6, 2, '15-20', 'Glutes — optional 2nd movement'),
  ('ULR 4-Day', 'Lower B', 'Straight-Leg Calf Raise/Press', 7, 2, '10-15', 'Calves'),
  ('ULR 4-Day', 'Lower B', 'Machine/Cable Ab Crunch', 8, 2, '12-15', 'Abs')
ON CONFLICT (program, day, exercise) DO UPDATE SET
  sort_order = EXCLUDED.sort_order,
  target_sets = EXCLUDED.target_sets,
  target_reps = EXCLUDED.target_reps,
  notes = EXCLUDED.notes,
  updated_at = NOW();
