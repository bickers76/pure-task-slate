# QA Checklist (Manual)

## Stage 1: Shell + Dashboard UI skeleton
- [ ] Sidebar renders cleanly
- [ ] Dashboard layout matches minimal style
- [ ] No console errors
- [ ] Dark mode toggle works (if included this stage)

## Stage 2: Supabase wiring
- [ ] SUPABASE.sql applies
- [ ] Can read from projects/tasks (empty is fine)
- [ ] No leaking secrets in logs

## Stage 3: Projects
- [ ] Create project works
- [ ] Projects list loads
- [ ] Quick Create can create a project

## Stage 4: Tasks on Dashboard
- [ ] “Your Tasks” table loads
- [ ] Add Task works
- [ ] Done section is collapsed by default and expands

## Stage 5: Project detail list view
- [ ] Filters/search work
- [ ] Done is collapsed by default

## Stage 6: Kanban
- [ ] Drag within column reorders
- [ ] Drag across columns changes status
- [ ] Done column is collapsed by default and expandable
- [ ] Order persists after refresh

## Stage 7-8: Polish
- [ ] Spacing/typography consistent
- [ ] Dark mode looks correct
- [ ] No console errors in core flows
