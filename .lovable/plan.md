

# Plan: Create `task-api` Edge Function

## Overview

Create a secure edge function that your external bot can call to perform CRUD operations on tasks. The function will:
- Use the service role key to bypass RLS
- Authenticate requests using a custom `BOT_API_KEY` secret
- Support create, update, list, and delete actions

---

## Implementation Steps

### Step 1: Add the BOT_API_KEY Secret

Request you to add the secret `BOT_API_KEY` with the value `mervbot-2026-secure`. This will be used to authenticate your bot's requests.

### Step 2: Create the Edge Function

Create `supabase/functions/task-api/index.ts` with:

- **CORS headers** for cross-origin requests
- **Bearer token authentication** checking against `BOT_API_KEY`
- **Action routing** for:
  - `list` - Get all tasks (optional `project_id` filter)
  - `create` - Create a new task
  - `update` - Update an existing task by ID
  - `delete` - Delete a task by ID
- **Service role client** to bypass RLS policies

### Step 3: Update Config

Add the function configuration to `supabase/config.toml` with `verify_jwt = false` (since we're using custom bearer auth).

---

## API Specification

**Endpoint**: `POST https://hsiquixmqiypzfngmtpz.supabase.co/functions/v1/task-api`

**Headers**:
```text
Authorization: Bearer mervbot-2026-secure
Content-Type: application/json
```

**Request Body Examples**:

```text
List all tasks:
{ "action": "list" }

List tasks for a project:
{ "action": "list", "project_id": "uuid-here" }

Create a task:
{
  "action": "create",
  "data": {
    "project_id": "uuid-here",
    "title": "New task",
    "priority": "High",
    "status": "Backlog",
    "assignee": "Mervbot"
  }
}

Update a task:
{
  "action": "update",
  "id": "task-uuid",
  "data": {
    "status": "In Progress",
    "assignee": "Wayne"
  }
}

Delete a task:
{ "action": "delete", "id": "task-uuid" }
```

**Response Format**:
```text
Success: { "success": true, "data": [...] }
Error: { "success": false, "error": "Error message" }
```

---

## Technical Details

**Files to create/modify**:

| File | Action |
|------|--------|
| `supabase/functions/task-api/index.ts` | Create |
| `supabase/config.toml` | Update |

**Validation rules enforced**:
- `status` must be one of: `Backlog`, `In Progress`, `Review`, `Done`
- `priority` must be one of: `Low`, `Medium`, `High`
- `assignee` must be one of: `Wayne`, `Mervbot`
- `project_id` is required for create action
- `id` is required for update and delete actions

**Security**:
- Bearer token authentication using `BOT_API_KEY`
- Service role key used internally (never exposed)
- Input validation before database operations

