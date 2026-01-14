-- Supabase schema for Task Manager (NO AUTH prototype)
-- WARNING: Policies below allow public access. Tighten when auth is added.

create extension if not exists pgcrypto;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text null,
  status text not null,
  priority text not null,
  due_date date null,
  tags text[] null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_status_check check (status in ('Backlog','Todo','In Progress','Done','Canceled')),
  constraint tasks_priority_check check (priority in ('Low','Medium','High'))
);

create index if not exists idx_tasks_project_id on public.tasks(project_id);
create index if not exists idx_tasks_project_status_sort on public.tasks(project_id, status, sort_order);
create index if not exists idx_tasks_due_date on public.tasks(due_date);
create index if not exists idx_tasks_updated on public.tasks(updated_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_projects_updated_at on public.projects;
create trigger trg_projects_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

drop trigger if exists trg_tasks_updated_at on public.tasks;
create trigger trg_tasks_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

alter table public.projects enable row level security;
alter table public.tasks enable row level security;

-- Projects policies (public prototype)
drop policy if exists "public read projects" on public.projects;
create policy "public read projects" on public.projects
for select to public using (true);

drop policy if exists "public insert projects" on public.projects;
create policy "public insert projects" on public.projects
for insert to public with check (true);

drop policy if exists "public update projects" on public.projects;
create policy "public update projects" on public.projects
for update to public using (true) with check (true);

drop policy if exists "public delete projects" on public.projects;
create policy "public delete projects" on public.projects
for delete to public using (true);

-- Tasks policies (public prototype)
drop policy if exists "public read tasks" on public.tasks;
create policy "public read tasks" on public.tasks
for select to public using (true);

drop policy if exists "public insert tasks" on public.tasks;
create policy "public insert tasks" on public.tasks
for insert to public with check (true);

drop policy if exists "public update tasks" on public.tasks;
create policy "public update tasks" on public.tasks
for update to public using (true) with check (true);

drop policy if exists "public delete tasks" on public.tasks;
create policy "public delete tasks" on public.tasks
for delete to public using (true);