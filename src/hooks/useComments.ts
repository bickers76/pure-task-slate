import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { commentsRepo } from "@/lib/repositories/commentsRepo";
import { LIVE_REFRESH_MS } from "@/hooks/useTasks";

export function useTaskComments(taskId: string | undefined) {
  return useQuery({
    queryKey: ["comments", taskId],
    queryFn: () => commentsRepo.listByTask(taskId!),
    enabled: !!taskId,
    refetchInterval: LIVE_REFRESH_MS,
  });
}

export function useAddComment(taskId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: string) => commentsRepo.create(taskId!, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", taskId] });
    },
  });
}
