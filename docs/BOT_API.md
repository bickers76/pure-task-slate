# Bot API

One endpoint, used by the agent to work the board.

```
POST https://<your-app-address>/api/bot
Authorization: Bearer <key>
Content-Type: application/json
```

Create a key in the app under **Settings → Bot API keys**. It is shown once; only a hash is stored. Revoking a key there stops it working immediately. The Settings page also shows the exact endpoint address.

Every request body has an `action`. Every response is JSON:

```json
{ "success": true, "data": ... }
{ "success": false, "error": "message" }
```

## Allowed values

| Field | Values |
|---|---|
| `status` | `Backlog`, `In Progress`, `Review`, `Done` |
| `priority` | `Low`, `Medium`, `High` |
| `assignee`, comment `author` | `Wayne`, `Mervbot` |

## Tasks

| Action | Body | Notes |
|---|---|---|
| `list` | optional `project_id`, `status`, `assignee` | Newest first, each task includes its `project`. |
| `get` | `id` | One task with its `project` and `comments`. |
| `create` | `data: { project_id, title, ... }` | `project_id` and `title` required. Defaults: `Backlog`, `Medium`, assigned to the key's agent. |
| `update` | `id`, `data: { ... }` | Only the fields below can be changed. |
| `delete` | `id` | |

Fields `update` accepts: `title`, `description`, `status`, `priority`, `assignee`, `due_date` (`YYYY-MM-DD`), `tags` (array of strings), `deliverable`, `review_feedback`, `blocked_reason`, `sort_order`. Anything else is ignored; a request with none of them is rejected. Text fields are trimmed and an empty string is stored as null.

## Comments

| Action | Body | Notes |
|---|---|---|
| `list-comments` | `id` (task id) | Oldest first. |
| `add-comment` | `id` (task id), `data: { body, author? }` | `author` defaults to the key's agent. |

## Projects

| Action | Body |
|---|---|
| `list-projects` | |
| `create-project` | `data: { name }` |
| `delete-project` | `id` (also deletes the project's tasks) |

## Working with the person

**Hand work over for review.** Set `status` to `Review` and put a link or path in `deliverable`. Moving a task into Review clears any earlier `review_feedback`.

```json
{ "action": "update", "id": "<task-id>", "data": { "status": "Review", "deliverable": "https://example.com/draft" } }
```

**Pick up review feedback.** When the person sends a task back, it returns to `In Progress` with `review_feedback` set. Find those with:

```json
{ "action": "list", "status": "In Progress", "assignee": "Mervbot" }
```

and act on any task whose `review_feedback` is not null.

**Ask for help.** Set `blocked_reason` to a short explanation of what is needed. The task shows up under "Needs you" in the app. The person clears it with Resolve; the bot can also clear it by sending `"blocked_reason": null`.

```json
{ "action": "update", "id": "<task-id>", "data": { "blocked_reason": "Need the login for the analytics account." } }
```

**Leave a note.** Use `add-comment` for progress notes and questions; read replies with `get` or `list-comments`.

```json
{ "action": "add-comment", "id": "<task-id>", "data": { "body": "First draft done, two sources still to check." } }
```
