import { useState } from "react";
import { Check, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Task } from "@/types";

export type ReviewDecision =
  | { type: "approve" }
  | { type: "changes"; feedback: string };

interface ReviewActionsProps {
  task: Task;
  onReview: (task: Task, decision: ReviewDecision) => void;
}

/** Approve / send-back controls shown on tasks sitting in Review. */
export function ReviewActions({ task, onReview }: ReviewActionsProps) {
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState("");

  const sendBack = () => {
    const trimmed = feedback.trim();
    if (!trimmed) return;
    onReview(task, { type: "changes", feedback: trimmed });
    setFeedback("");
    setOpen(false);
  };

  return (
    <>
      <div className="flex gap-2">
        <Button
          size="sm"
          className="h-9 md:h-7 min-w-0 flex-1 gap-1 px-2 bg-emerald-600 text-xs text-white hover:bg-emerald-700"
          onClick={() => onReview(task, { type: "approve" })}
        >
          <Check className="h-3.5 w-3.5" />
          Approve
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-9 md:h-7 min-w-0 flex-1 gap-1 px-2 text-xs"
          onClick={() => setOpen(true)}
        >
          <Undo2 className="h-3.5 w-3.5" />
          Send back
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send back for changes</DialogTitle>
            <DialogDescription>
              “{task.title}” moves back to In Progress with your feedback attached.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="What needs to change?"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={4}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={sendBack} disabled={!feedback.trim()}>
              Send back
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
