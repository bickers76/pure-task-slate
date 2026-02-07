-- 1. Add assignee column with check constraint
ALTER TABLE public.tasks 
ADD COLUMN assignee text NOT NULL DEFAULT 'Mervbot';

ALTER TABLE public.tasks
ADD CONSTRAINT tasks_assignee_check CHECK (assignee IN ('Wayne', 'Mervbot'));

-- 2. Add deliverable column
ALTER TABLE public.tasks 
ADD COLUMN deliverable text NULL;

-- 3. Update existing tasks: change 'Todo' to 'Backlog', 'Canceled' to 'Done'
UPDATE public.tasks SET status = 'Backlog' WHERE status = 'Todo';
UPDATE public.tasks SET status = 'Done' WHERE status = 'Canceled';

-- 4. Drop old status constraint and add new one
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE public.tasks 
ADD CONSTRAINT tasks_status_check CHECK (status IN ('Backlog', 'In Progress', 'Review', 'Done'));

-- 5. Update RLS policies for projects table to require authenticated users
DROP POLICY IF EXISTS "public read projects" ON public.projects;
DROP POLICY IF EXISTS "public insert projects" ON public.projects;
DROP POLICY IF EXISTS "public update projects" ON public.projects;
DROP POLICY IF EXISTS "public delete projects" ON public.projects;

CREATE POLICY "authenticated read projects" ON public.projects
FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated insert projects" ON public.projects
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "authenticated update projects" ON public.projects
FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated delete projects" ON public.projects
FOR DELETE TO authenticated USING (true);

-- 6. Update RLS policies for tasks table to require authenticated users
DROP POLICY IF EXISTS "public read tasks" ON public.tasks;
DROP POLICY IF EXISTS "public insert tasks" ON public.tasks;
DROP POLICY IF EXISTS "public update tasks" ON public.tasks;
DROP POLICY IF EXISTS "public delete tasks" ON public.tasks;

CREATE POLICY "authenticated read tasks" ON public.tasks
FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated insert tasks" ON public.tasks
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "authenticated update tasks" ON public.tasks
FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated delete tasks" ON public.tasks
FOR DELETE TO authenticated USING (true);