# GetShitDone

A task board shared between a person and an AI agent. Tasks belong to projects, are owned by either **Wayne** or **Mervbot**, and move through `Backlog → In Progress → Review → Done`. The agent works the board through an HTTP API; the person reviews its work in the app.

## What it does

- **List and kanban views** across all projects (dashboard) or one project, with search, filters, inline editing and drag and drop.
- **Review workflow:** tasks in Review can be approved, or sent back to In Progress with feedback the agent can read.
- **Needs you:** one click shows everything waiting on a human: tasks in Review and tasks the agent has flagged as blocked.
- **Comments** on each task, written from the app or by the agent.
- **Live updates:** the board refreshes when the agent or another tab changes something.
- **Bot API** for the agent: see [docs/BOT_API.md](docs/BOT_API.md).

Keyboard: `n` new task, `/` search, `Esc` clears the search box.

## Stack

Vite, React, TypeScript, Tailwind, shadcn/ui, TanStack Query, dnd-kit, and Supabase (Postgres, auth, realtime, one edge function). The project was started in Lovable and syncs with it through this repository.

## Running locally

```sh
npm install
npm run dev      # http://localhost:8080
npm test         # unit tests
npm run lint
npm run build
```

`.env` holds the Supabase URL and the publishable (anon) key. Both are safe to expose; access is controlled by row-level security.

## Database

Schema changes live in `supabase/migrations/` and must be applied to the Supabase project in filename order. They are written to be safe to re-run.

### Who can sign in

There is no sign-up screen. Access to data is limited to accounts listed in the `app_members` table; a signed-in account that is not listed sees an empty board. Everyone who had an account when the access migration ran was added automatically. To add someone later, create the account in Supabase Auth and run:

```sql
INSERT INTO public.app_members (user_id)
SELECT id FROM auth.users WHERE email = 'person@example.com';
```

To see who has access:

```sql
SELECT u.email, m.added_at
FROM public.app_members m JOIN auth.users u ON u.id = m.user_id;
```

### Bot API secret

The `task-api` edge function needs a `BOT_API_KEY` secret set in Supabase. Never commit its value. An earlier key was committed to this repository's history and must be treated as public: rotate it.

## Layout

```
src/pages/                 Dashboard, Projects, ProjectDetail, Login
src/components/tasks/      Board view, table, kanban, task dialog, comments, review controls
src/hooks/useTaskBoard.ts  Filters, derived lists and every task action (shared by both pages)
src/lib/taskOrder.ts       Drag-and-drop ordering
src/lib/taskFilters.ts     Filtering, "needs you", dashboard counts
src/lib/repositories/      Supabase queries
supabase/functions/task-api/  Bot API
supabase/migrations/       Schema
```
