import { useEffect, useState, type FormEvent } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { COLUMNS, TAG_COLORS, tagClasses, type Task, type TaskStatus, type TagColor } from "@/lib/tasks";
import { cn } from "@/lib/utils";

export type TaskDraft = Omit<Task, "id" | "position">;

export function TaskDialog({
  open,
  onOpenChange,
  initial,
  defaultStatus,
  onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: Task | null;
  defaultStatus: TaskStatus;
  onSave: (draft: TaskDraft) => void;
}) {
  const blank: TaskDraft = {
    title: "",
    description: "",
    status: defaultStatus,
    tag: "General",
    tag_color: "violet",
    progress: 0,
    due_date: null,
  };
  const [d, setD] = useState<TaskDraft>(blank);

  useEffect(() => {
    if (open) setD(initial ? { ...initial } : { ...blank, status: defaultStatus });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial, defaultStatus]);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!d.title.trim()) return;
    onSave(d);
    onOpenChange(false);
  }

  const field = "w-full rounded-xl border bg-surface px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">{initial ? "Edit task" : "New task"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <input autoFocus className={field} placeholder="Task title" value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} />
          <textarea className={cn(field, "min-h-20 resize-none")} placeholder="Description" value={d.description} onChange={(e) => setD({ ...d, description: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1.5 text-xs font-semibold text-muted-foreground">
              Tag
              <input className={field} value={d.tag} onChange={(e) => setD({ ...d, tag: e.target.value })} />
            </label>
            <label className="space-y-1.5 text-xs font-semibold text-muted-foreground">
              Due date
              <input type="date" className={field} value={d.due_date ?? ""} onChange={(e) => setD({ ...d, due_date: e.target.value || null })} />
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            {TAG_COLORS.map((c: TagColor) => (
              <button
                type="button"
                key={c}
                onClick={() => setD({ ...d, tag_color: c })}
                className={cn("rounded-full px-3 py-1 text-xs font-semibold capitalize ring-offset-2 transition", tagClasses[c], d.tag_color === c && "ring-2 ring-ring")}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1.5 text-xs font-semibold text-muted-foreground">
              Column
              <select className={field} value={d.status} onChange={(e) => setD({ ...d, status: e.target.value as TaskStatus })}>
                {COLUMNS.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5 text-xs font-semibold text-muted-foreground">
              Progress · {d.progress}%
              <input type="range" min={0} max={100} step={5} className="mt-3 w-full accent-primary" value={d.progress} onChange={(e) => setD({ ...d, progress: Number(e.target.value) })} />
            </label>
          </div>
          <button className="w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground shadow-glow">
            {initial ? "Save changes" : "Create task"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
