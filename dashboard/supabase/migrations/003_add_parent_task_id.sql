-- Agregar soporte para subtasks: parent_task_id permite jerarquía task/subtask
-- Si parent_task_id es NULL, es un task raíz. Si tiene valor, es subtask de ese task.

ALTER TABLE pkl_tasks ADD COLUMN IF NOT EXISTS parent_task_id TEXT DEFAULT NULL;

-- Índice para buscar subtasks de un task padre rápidamente
CREATE INDEX IF NOT EXISTS idx_pkl_tasks_parent ON pkl_tasks(parent_task_id) WHERE parent_task_id IS NOT NULL;
