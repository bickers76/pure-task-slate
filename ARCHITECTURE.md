# Architecture

## Routes
- `/` Dashboard: every task across projects
- `/projects` Project list
- `/projects/:projectId` One project's tasks
- `/login` Sign in (redirects to `/` when already signed in)

Pages are lazy-loaded. Everything except `/login` sits behind `AuthGate`.

## Data model (Supabase / Postgres)

### projects
`id`, `name`, `created_at`, `updated_at`

### tasks
| Column | Notes |
|---|---|
| `id`, `project_id` | project delete cascades to tasks |
| `title`, `description` | |
| `status` | `Backlog`, `In Progress`, `Review`, `Done` |
| `priority` | `Low`, `Medium`, `High` |
| `assignee` | `Wayne` or `Mervbot` |
| `due_date` | plain date, no time zone |
| `tags` | text array |
| `deliverable` | URL or file path to the output |
| `review_feedback` | set when a reviewed task is sent back |
| `blocked_reason` | set by the assignee when it needs input |
| `sort_order` | integer position, see ordering below |
| `completed_at` | maintained by a trigger when status enters or leaves `Done` |
| `created_at`, `updated_at` | `updated_at` maintained by a trigger |

### task_comments
`id`, `task_id` (cascade), `author` (`Wayne` or `Mervbot`), `body`, `created_at`

### app_members
`user_id` (references `auth.users`), `added_at`. Row-level security on `projects`, `tasks` and `task_comments` allows only accounts listed here (`public.is_app_member()`). Membership is changed from SQL only.

## Access paths
- **App:** Supabase JS client with the publishable key and the user's session; row-level security applies.
- **Bot:** `supabase/functions/task-api` authenticates with the `BOT_API_KEY` secret and uses the service role, which bypasses row-level security. `update` accepts a fixed list of columns. See `docs/BOT_API.md`.

## Frontend structure
- `lib/repositories/*` wrap Supabase queries; `hooks/useTasks.ts`, `useProjects.ts`, `useComments.ts` wrap them in TanStack Query.
- `hooks/useTaskBoard.ts` owns filter state, the derived active/done lists and every task action. Both pages use it and render `components/tasks/TaskBoardView.tsx`.
- `hooks/useRealtimeSync.ts` (mounted in `AppShell`) subscribes to Postgres changes and invalidates the query cache.
- Pure logic with unit tests: `lib/taskOrder.ts`, `lib/taskFilters.ts`.

## Kanban ordering
`sort_order` is one sequence shared by all tasks. The dashboard and project pages each show a subset (one project, or a filtered list), so a drop never renumbers a column from zero. Instead `computeReorder` reuses the sort values already held by the visible cards in the target column, in the new order, and only writes rows that changed. Tasks hidden by a filter or belonging to another project keep their relative position.

Done is not a sortable column: dropping a card on the Completed panel only changes its status. The panel lists the most recently completed first.

## Needs you
A task needs attention when it is in `Review` or has a `blocked_reason`, and is not `Done`. The dashboard count, the filter toggle and the bot's "ask for help" flow all use this definition (`needsAttention` in `lib/taskFilters.ts`).
