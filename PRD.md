# Task Management App (Dashboard-first, Simple + Beautiful)

## Product Goal
A minimal task manager with a calm, professional UI. Dashboard-first experience with projects and tasks, supporting List and Kanban.

“Simplicity + beauty” is the primary success metric.

## Core Decisions
- Homepage is a **Dashboard** (not a marketing/empty landing page)
- UI stays minimal (no fake analytics)
- **Done tasks are collapsed by default** (Accordion in list; collapsed column in Kanban)

## Scope (MVP)
### Must Have
- App shell: left sidebar + top bar (clean, minimal)
- Dashboard (`/`)
  - Quick Create (Project or Task)
  - Small stat cards (real counts)
  - “Your Tasks” table with search + filters
  - Collapsed “Done (n)” section at bottom
- Projects
  - `/projects` list
  - Create project
  - Project detail `/projects/:id`
- Tasks (per project)
  - Create/Edit/Delete
  - Fields: title (required), description, status, priority, due date, tags
  - List view (filters + collapsed Done)
  - Kanban view (drag/drop; Done collapsed column)
- Persistence: Supabase (Lovable Cloud), no auth for now (public policies)

### Non-Goals
- Multi-user collaboration
- Comments/mentions
- Attachments
- Reporting beyond basic counts

## Acceptance Criteria
- Dashboard loads counts + tasks from Supabase with no console errors
- Creating/editing/deleting projects and tasks persists after refresh
- Drag/drop updates status + order and persists
- Done is collapsed by default in list and kanban
- UI matches the “clean shadcn” bar
