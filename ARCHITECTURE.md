# Architecture

One Cloudflare Worker (`pure-task-slate`) serves everything. Requests to `/api/*` run the Worker code in `worker/`; every other path is answered from the built React app in `dist/`, falling back to `index.html` so client-side routes work. Data is in one D1 database bound as `DB`.

## Routes (browser)
- `/` Dashboard: every task across projects
- `/projects` Project list
- `/projects/:projectId` One project's tasks
- `/settings` Bot API keys and password
- `/login` Sign in, or first-time setup (redirects to `/` when already signed in)

Pages are lazy-loaded. Everything except `/login` sits behind `AuthGate`.

## API

| Path | Who calls it | Auth |
|---|---|---|
| `/api/auth/*` | the app | session, setup, login, logout, password |
| `/api/projects`, `/api/tasks`, `/api/tasks/:id/comments`, `/api/keys` | the app | session cookie |
| `/api/bot` | agents | `Authorization: Bearer <key>` |

State-changing requests from the app are refused when their `Origin` is another site. The bot API's contract is in `docs/BOT_API.md`.

`worker/data.ts` holds validation and SQL for both callers, so the app and the bot follow the same rules. The differences: the bot cannot move a task to another project, and comments from the app are always recorded as the human.

## Data model (D1 / SQLite)

Ids are UUID strings, timestamps ISO-8601 UTC strings, dates `YYYY-MM-DD`.

- **users**, **sessions**, **login_attempts**: the owner account, session token hashes, failed sign-ins.
- **settings**: key/value; holds the hash of the one-time setup code until it is used.
- **api_keys**: name, agent, SHA-256 hash of the key, a short hint, last use. The key itself is never stored.
- **projects**: `id`, `name`, timestamps.
- **tasks**: `project_id` (cascade), `title`, `description`, `status`, `priority`, `assignee`, `due_date`, `tags` (JSON array), `deliverable`, `review_feedback`, `blocked_reason`, `sort_order`, `completed_at`, timestamps.
- **task_comments**: `task_id` (cascade), `author`, `body`, `created_at`.

Rules applied in `worker/data.ts` when a task's status changes: entering `Done` stamps `completed_at`, leaving it clears it, and entering `Review` clears earlier `review_feedback`.

## Frontend structure
- `lib/api.ts` is the only place that calls `fetch`. A 401 from any data request drops the app back to sign-in.
- `lib/repositories/*` map resources to API calls; `hooks/useTasks.ts`, `useProjects.ts`, `useComments.ts` wrap them in TanStack Query with a refresh interval, which is how changes from the bot or another tab appear.
- `hooks/useTaskBoard.ts` owns filter state, the derived active/done lists and every task action. Both board pages use it and render `components/tasks/TaskBoardView.tsx`.
- Pure logic with unit tests: `lib/taskOrder.ts`, `lib/taskFilters.ts`.

## Kanban ordering
`sort_order` is one sequence shared by all tasks. The dashboard and project pages each show a subset (one project, or a filtered list), so a drop never renumbers a column from zero. Instead `computeReorder` reuses the sort values already held by the visible cards in the target column, in the new order, and only sends rows that changed. The server applies them in one batch. Tasks hidden by a filter or belonging to another project keep their relative position.

Done is not a sortable column: dropping a card on the Completed panel only changes its status. The panel lists the most recently completed first.

## Needs you
A task needs attention when it is in `Review` or has a `blocked_reason`, and is not `Done`. The dashboard count, the filter toggle and the bot's "ask for help" flow all use this definition (`needsAttention` in `lib/taskFilters.ts`).
