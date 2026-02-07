export type TaskStatus = 'Backlog' | 'In Progress' | 'Review' | 'Done';
export type TaskPriority = 'Low' | 'Medium' | 'High';
export type TaskAssignee = 'Wayne' | 'Mervbot';

export interface Project {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  tags: string[] | null;
  sort_order: number;
  assignee: TaskAssignee;
  deliverable: string | null;
  created_at: string;
  updated_at: string;
  project?: Project;
}

export const TASK_STATUSES: TaskStatus[] = ['Backlog', 'In Progress', 'Review', 'Done'];
export const TASK_PRIORITIES: TaskPriority[] = ['Low', 'Medium', 'High'];
export const ACTIVE_STATUSES: TaskStatus[] = ['Backlog', 'In Progress', 'Review'];
export const TASK_ASSIGNEES: TaskAssignee[] = ['Wayne', 'Mervbot'];
