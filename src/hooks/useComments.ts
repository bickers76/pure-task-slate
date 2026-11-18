import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { commentsRepo } from "@/lib/repositories/commentsRepo";
import { TaskAssignee } from "@/types";

export function useTaskComments(taskId: string | undefined) {
  return useQuery({
    queryKey: ["comments", taskId],
    queryFn: () => commentsRepo.listByTask(taskId!),
    enabled: !!taskId,
    // The table arrives with a migration; don't hammer the API if it's missing.
    retry: false,
  });
}

export function useAddComment(taskId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ author, body }: { author: TaskAssignee; body: string }) =>
      commentsRepo.create(taskId!, author, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", taskId] });
    },
  });
}
