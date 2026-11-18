import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tasksRepo, CreateTaskInput, UpdateTaskInput } from "@/lib/repositories/tasksRepo";
import { Task } from "@/types";
import { OrderUpdate } from "@/lib/taskOrder";

export function useTasks() {
  return useQuery({
    queryKey: ["tasks"],
    queryFn: () => tasksRepo.listAll(),
  });
}

export function useProjectTasks(projectId: string | undefined) {
  return useQuery({
    queryKey: ["tasks", "project", projectId],
    queryFn: () => (projectId ? tasksRepo.listByProject(projectId) : []),
    enabled: !!projectId,
  });
}

export function useTask(id: string | undefined) {
  return useQuery({
    queryKey: ["tasks", id],
    queryFn: () => (id ? tasksRepo.getById(id) : null),
    enabled: !!id,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTaskInput) => tasksRepo.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateTaskInput }) =>
      tasksRepo.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => tasksRepo.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useRestoreTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (task: Task) => tasksRepo.restore(task),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useReorderTasks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: OrderUpdate[]) =>
      tasksRepo.reorderTasks(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}
