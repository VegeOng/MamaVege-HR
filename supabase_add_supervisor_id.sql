-- Add supervisor_id column to profiles: each employee can be assigned a direct supervisor
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS supervisor_id uuid REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_supervisor_id ON profiles(supervisor_id);
