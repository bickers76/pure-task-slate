import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tasksRepo, CreateTaskInput, UpdateTaskInput } from "@/lib/repositories/tasksRepo";
import { TaskStatus } from "@/types";

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
      queryClient.invalidateQueries({ queryKey: ["stats"] });
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
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => tasksRepo.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

export function useReorderTasks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: { id: string; sort_order: number; status?: TaskStatus }[]) =>
      tasksRepo.reorderTasks(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useTaskStats() {
  return useQuery({
    queryKey: ["stats"],
    queryFn: async () => {
      const [openCount, inProgressCount, dueSoonCount] = await Promise.all([
        tasksRepo.getOpenCount(),
        tasksRepo.getInProgressCount(),
        tasksRepo.getDueSoonCount(),
      ]);
      return { openCount, inProgressCount, dueSoonCount };
    },
  });
}
