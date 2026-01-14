# Architecture

## Routes
- `/` Dashboard
- `/projects` Projects list
- `/projects/[projectId]` Project detail (List/Kanban)

## Supabase Tables
### projects
- id (uuid, pk)
- name (text)
- created_at (timestamptz)
- updated_at (timestamptz)

### tasks
- id (uuid, pk)
- project_id (uuid, fk)
- title (text)
- description (text)
- status (Todo|In Progress|Done)
- priority (Low|Medium|High)
- due_date (date)
- tags (text[])
- sort_order (int)
- created_at (timestamptz)
- updated_at (timestamptz)

## Data Access
- `lib/supabaseClient.ts`
- `lib/repositories/projectsRepo.ts`
- `lib/repositories/tasksRepo.ts`

## UI Layout
- AppShell: Sidebar + TopBar + main container
- Dashboard: stat cards + tasks table + Done accordion
- Done collapsing is a first-class rule:
  - List views: Done inside Accordion
  - Kanban: Done collapsed column, expandable

## Kanban Ordering
- sort_order within (project_id, status)
- On drop: re-sequence source + destination columns to 0..n-1 and persist
