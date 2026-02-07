ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS assignee text NOT NULL DEFAULT 'Mervbot';
ALTER TABLE public.tasks ADD CONSTRAINT tasks_assignee_check CHECK (assignee IN ('Wayne', 'Mervbot'));
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS deliverable text;
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_status_check CHECK (status IN ('Backlog', 'In Progress', 'Review', 'Done'));
UPDATE public.tasks SET status = 'Backlog' WHERE status = 'Todo';
UPDATE public.tasks SET status = 'Done' WHERE status = 'Canceled';
