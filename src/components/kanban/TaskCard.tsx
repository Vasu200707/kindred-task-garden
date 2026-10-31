import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CalendarDays, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { format, isPast, parseISO } from "date-fns";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { tagClasses, type Task } from "@/lib/tasks";
import { cn } from "@/lib/utils";

export function TaskCardView({
  task,
  overlay,
  onEdit,
  onDelete,
}: {
  task: Task;
  overlay?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const overdue = task.due_date && task.status !== "done" && isPast(parseISO(task.due_date + "T23:59:59"));
  return (
    <div
      className={cn(
        "group rounded-3xl bg-card p-5 shadow-card transition-shadow hover:shadow-lift",
        overlay && "card-tilt cursor-grabbing",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={cn("rounded-full px-3.5 py-1.5 text-xs font-semibold", tagClasses[task.tag_color])}>{task.tag}</span>
        {onEdit && (
          <DropdownMenu>
            <DropdownMenuTrigger
              onPointerDown={(e) => e.stopPropagation()}
              className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
              aria-label="Task options"
            >
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}><Pencil className="h-4 w-4" /> Edit</DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-destructive"><Trash2 className="h-4 w-4" /> Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <h4 className="mt-3.5 font-semibold leading-snug">{task.title}</h4>
      {task.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{task.description}</p>}
      <div className="mt-4 flex justify-end text-xs font-semibold text-muted-foreground">{task.progress}%</div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-primary-soft">
        <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${task.progress}%` }} />
      </div>
      {task.due_date && (
        <div className={cn("mt-4 flex items-center gap-1.5 text-xs font-medium", overdue ? "text-destructive" : "text-muted-foreground")}>
          <CalendarDays className="h-3.5 w-3.5" />
          {overdue ? "Overdue · " : ""}
          {format(parseISO(task.due_date), "d MMM yyyy")}
        </div>
      )}
    </div>
  );
}

export function SortableTaskCard(props: { task: Task; onEdit: () => void; onDelete: () => void }) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: props.task.id,
    data: { type: "task", task: props.task },
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      className={cn("cursor-grab touch-none", isDragging && "opacity-30")}
    >
      <TaskCardView {...props} />
    </div>
  );
}
