-- Collaboration features and access lock-down.
-- Safe to run more than once.

-- ---------------------------------------------------------------------------
-- 1. Completion timestamp (previously approximated with updated_at)
-- ---------------------------------------------------------------------------
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS completed_at timestamptz;

UPDATE public.tasks
SET completed_at = updated_at
WHERE status = 'Done' AND completed_at IS NULL;

CREATE OR REPLACE FUNCTION public.set_task_completed_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'Done' THEN
    IF TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'Done' OR NEW.completed_at IS NULL THEN
      NEW.completed_at = now();
    END IF;
  ELSE
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tasks_completed_at ON public.tasks;
CREATE TRIGGER trg_tasks_completed_at
BEFORE INSERT OR UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.set_task_completed_at();

-- ---------------------------------------------------------------------------
-- 2. "Blocked / needs input" flag an assignee can raise
-- ---------------------------------------------------------------------------
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS blocked_reason text;

-- ---------------------------------------------------------------------------
-- 3. Comments on tasks
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  author text NOT NULL CHECK (author IN ('Wayne', 'Mervbot')),
  body text NOT NULL CHECK (length(btrim(body)) > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_comments_task_created
  ON public.task_comments(task_id, created_at);

ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 4. Access: only listed members can read or write the board.
--    Before this, any account that signed up had full access.
--    Everyone who already has an account when this runs is added as a member.
--    To add someone later:
--      INSERT INTO public.app_members (user_id)
--      SELECT id FROM auth.users WHERE email = 'person@example.com';
--    The bot is unaffected: task-api uses the service role, which bypasses RLS.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_members (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  added_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_members ENABLE ROW LEVEL SECURITY;

INSERT INTO public.app_members (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- Membership can be read by its owner and changed only from the SQL editor.
DROP POLICY IF EXISTS "members read own membership" ON public.app_members;
CREATE POLICY "members read own membership" ON public.app_members
FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.is_app_member()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.app_members WHERE user_id = auth.uid());
$$;

REVOKE ALL ON FUNCTION public.is_app_member() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_app_member() TO authenticated;

DO $$
DECLARE
  t text;
  a text;
BEGIN
  FOREACH t IN ARRAY ARRAY['projects', 'tasks', 'task_comments'] LOOP
    FOREACH a IN ARRAY ARRAY['read', 'insert', 'update', 'delete'] LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'public ' || a || ' ' || t, t);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'authenticated ' || a || ' ' || t, t);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'members ' || a || ' ' || t, t);
    END LOOP;

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.is_app_member())',
      'members read ' || t, t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_app_member())',
      'members insert ' || t, t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.is_app_member()) WITH CHECK (public.is_app_member())',
      'members update ' || t, t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.is_app_member())',
      'members delete ' || t, t);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 5. Live updates for comments
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'task_comments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.task_comments;
  END IF;
END $$;
