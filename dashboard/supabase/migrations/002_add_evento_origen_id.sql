-- Add evento_origen_id column to pkl_tasks for linking tasks to original events
ALTER TABLE pkl_tasks ADD COLUMN IF NOT EXISTS evento_origen_id TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_pkl_tasks_evento_origen ON pkl_tasks(evento_origen_id);
