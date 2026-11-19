import { useState } from "react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAddComment, useTaskComments } from "@/hooks/useComments";
import { cn } from "@/lib/utils";

interface TaskCommentsProps {
  taskId: string;
}

/** Conversation on a task between the owner and the bot. */
export function TaskComments({ taskId }: TaskCommentsProps) {
  const { data: comments = [], isLoading } = useTaskComments(taskId);
  const addComment = useAddComment(taskId);
  const [body, setBody] = useState("");

  const submit = async () => {
    const trimmed = body.trim();
    if (!trimmed) return;
    try {
      await addComment.mutateAsync(trimmed);
      setBody("");
    } catch {
      toast.error("Failed to add comment");
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="task-comment">Comments{comments.length > 0 && ` (${comments.length})`}</Label>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading comments...</p>
      ) : (
        comments.length > 0 && (
          <ul className="max-h-56 space-y-2 overflow-y-auto scrollbar-thin pr-1">
            {comments.map((comment) => (
              <li key={comment.id} className="flex gap-2">
                <span
                  className={cn(
                    "mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white",
                    comment.author === "Wayne" ? "bg-blue-500" : "bg-purple-500"
                  )}
                >
                  {comment.author[0]}
                </span>
                <div className="min-w-0 flex-1 rounded-md bg-muted/50 px-2.5 py-1.5">
                  <p className="text-[11px] text-muted-foreground">
                    <span className="font-medium text-foreground">{comment.author}</span>
                    {" · "}
                    {formatDistanceToNow(parseISO(comment.created_at), { addSuffix: true })}
                  </p>
                  <p className="whitespace-pre-wrap break-words text-sm">{comment.body}</p>
                </div>
              </li>
            ))}
          </ul>
        )
      )}

      <div className="flex items-end gap-2">
        <Textarea
          id="task-comment"
          placeholder="Write a comment..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submit();
            }
          }}
          rows={2}
          className="min-h-0"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={submit}
          disabled={!body.trim() || addComment.isPending}
        >
          {addComment.isPending ? "Sending..." : "Comment"}
        </Button>
      </div>
    </div>
  );
}
