-- Update the status check constraint to only allow Todo, In Progress, Done
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_status_check CHECK (status IN ('Todo', 'In Progress', 'Done'));