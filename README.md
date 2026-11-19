# GetShitDone

A task board shared between a person and an AI agent. Tasks belong to projects, are owned by either **Wayne** or **Mervbot**, and move through `Backlog → In Progress → Review → Done`. The agent works the board through an HTTP API; the person reviews its work in the app.

Everything runs on Cloudflare: one Worker serves the React app and the API, and data lives in a D1 database.

## What it does

- **List and kanban views** across all projects (dashboard) or one project, with search, filters, inline editing and drag and drop.
- **Review workflow:** tasks in Review can be approved, or sent back to In Progress with feedback the agent can read.
- **Needs you:** one click shows everything waiting on a human: tasks in Review and tasks the agent has flagged as blocked.
- **Comments** on each task, written from the app or by the agent.
- **Bot API** for the agent, with keys you create and revoke under Settings: see [docs/BOT_API.md](docs/BOT_API.md).
- Open boards re-read from the server every 10 seconds, so the agent's changes appear on their own.

Keyboard: `n` new task, `/` search, `Esc` clears the search box.

## Stack

Vite, React, TypeScript, Tailwind, shadcn/ui, TanStack Query and dnd-kit in the browser. A Cloudflare Worker (`worker/`) for the API, D1 (SQLite) for data. No other services.

## Running locally

```sh
npm install
npm run db:migrate:local   # create the local database (first time only)
npm run dev:api            # API on http://localhost:8787
npm run dev                # app on http://localhost:8080, proxies /api to the Worker
```

A new database has no account. Sign-up is closed, so the first account is created with a one-time setup code. For local use, store the hash of a code of your choice:

```sh
HASH=$(printf 'my-local-code' | sha256sum | cut -d' ' -f1)
npx wrangler d1 execute pure-task-slate --local \
  --command "INSERT INTO settings (key, value) VALUES ('setup_code_hash', '$HASH')"
```

then open `http://localhost:8080/?setup=my-local-code`.

## Checks

```sh
npm run typecheck   # app and Worker
npm run lint
npm test            # unit tests (ordering, filters, counts)
npm run test:api    # end-to-end API test against a local Worker
```

## Deploying

Cloudflare Workers Builds deploys every push to `main` (build command `npm run build`, deploy command `npx wrangler deploy`). To deploy by hand:

```sh
npm run deploy
```

Schema changes go in `migrations/` as numbered SQL files and are applied with:

```sh
npm run db:migrate
```

## Accounts and access

- There is one owner account, created once with the setup code. After that the setup route is closed for good.
- Passwords are stored as salted PBKDF2 hashes; sessions are HttpOnly cookies that last 30 days. Ten failed sign-ins from one address lock that address out for 15 minutes.
- Change the password under Settings; that signs out every other device.
- If you are locked out, delete the account row and store a new setup code hash:

```sh
npx wrangler d1 execute pure-task-slate --remote --command "DELETE FROM users"
npx wrangler d1 execute pure-task-slate --remote \
  --command "INSERT OR REPLACE INTO settings (key, value) VALUES ('setup_code_hash', '<sha256 of a new code>')"
```

## Layout

```
src/pages/                 Dashboard, Projects, ProjectDetail, Settings, Login
src/components/tasks/      Board view, table, kanban, task dialog, comments, review controls
src/hooks/useTaskBoard.ts  Filters, derived lists and every task action (shared by both board pages)
src/lib/api.ts             Fetch wrapper for the app's API
src/lib/repositories/      One module per resource
src/lib/taskOrder.ts       Drag-and-drop ordering
src/lib/taskFilters.ts     Filtering, "needs you", dashboard counts
worker/index.ts            Routing for /api/*
worker/auth.ts             Setup, sign-in, sessions
worker/data.ts             Validation and queries for projects, tasks, comments
worker/bot.ts              Bot API
migrations/                D1 schema
```
