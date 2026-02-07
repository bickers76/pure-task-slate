-- Replace public RLS policies with authenticated-only policies

-- Projects policies
drop policy if exists "public read projects" on public.projects;
create policy "authenticated read projects" on public.projects
for select to authenticated using (true);

drop policy if exists "public insert projects" on public.projects;
create policy "authenticated insert projects" on public.projects
for insert to authenticated with check (true);

drop policy if exists "public update projects" on public.projects;
create policy "authenticated update projects" on public.projects
for update to authenticated using (true) with check (true);

drop policy if exists "public delete projects" on public.projects;
create policy "authenticated delete projects" on public.projects
for delete to authenticated using (true);

-- Tasks policies
drop policy if exists "public read tasks" on public.tasks;
create policy "authenticated read tasks" on public.tasks
for select to authenticated using (true);

drop policy if exists "public insert tasks" on public.tasks;
create policy "authenticated insert tasks" on public.tasks
for insert to authenticated with check (true);

drop policy if exists "public update tasks" on public.tasks;
create policy "authenticated update tasks" on public.tasks
for update to authenticated using (true) with check (true);

drop policy if exists "public delete tasks" on public.tasks;
create policy "authenticated delete tasks" on public.tasks
for delete to authenticated using (true);
