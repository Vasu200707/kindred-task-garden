import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { Bot, LayoutGrid, LogOut, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { COLUMNS, tasksQuery, type Task, type TaskStatus } from "@/lib/tasks";
import { SortableTaskCard, TaskCardView } from "@/components/kanban/TaskCard";
import { TaskDialog, type TaskDraft } from "@/components/kanban/TaskDialog";
import { StatsPanel } from "@/components/kanban/StatsPanel";
import { ChatPanel } from "@/components/kanban/ChatPanel";
import { Logo } from "../index";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/board")({
  head: () => ({
    meta: [
      { title: "My board — Flowboard" },
      { name: "description", content: "Your Kanban board with To Do, In Progress and Done." },
      { property: "og:title", content: "My board — Flowboard" },
      { property: "og:description", content: "Your Kanban board with To Do, In Progress and Done." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(tasksQuery),
  component: Board,
});

function Column({ id, title, count, children, onAdd }: { id: TaskStatus; title: string; count: number; children: React.ReactNode; onAdd: () => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${id}`, data: { type: "column", status: id } });
  return (
    <div className="flex min-w-[280px] flex-1 flex-col">
      <div className="mb-4 flex items-center justify-between px-1">
        <h3 className="font-semibold">
          {title} <span className="ml-1 text-sm text-muted-foreground">{count}</span>
        </h3>
        <button onClick={onAdd} aria-label={`Add task to ${title}`} className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground transition hover:bg-primary hover:text-primary-foreground">
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-40 flex-1 flex-col gap-4 rounded-3xl p-1 transition-colors",
          isOver && "bg-primary-soft/60 outline-2 outline-dashed outline-primary/30",
        )}
      >
        {children}
      </div>
    </div>
  );
}

function Board() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: tasks } = useSuspenseQuery(tasksQuery);
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<{ open: boolean; task: Task | null; status: TaskStatus }>({ open: false, task: null, status: "todo" });
  const [active, setActive] = useState<Task | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const setTasks = (fn: (t: Task[]) => Task[]) => qc.setQueryData<Task[]>(tasksQuery.queryKey, (old) => fn(old ?? []));

  const save = useMutation({
    mutationFn: async (args: { id?: string; draft: Partial<TaskDraft> & { position?: number } }) => {
      if (args.id) {
        const { error } = await supabase.from("tasks").update({ ...args.draft, updated_at: new Date().toISOString() }).eq("id", args.id);
        if (error) throw error;
      } else {
        const { data: u } = await supabase.auth.getUser();
        const { error } = await supabase.from("tasks").insert({ ...(args.draft as TaskDraft), user_id: u.user!.id, position: Date.now() });
        if (error) throw error;
      }
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't save"),
    onSettled: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      setTasks((t) => t.filter((x) => x.id !== id));
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => toast.success("Task deleted"),
    onError: () => toast.error("Couldn't delete task"),
    onSettled: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return q ? tasks.filter((t) => `${t.title} ${t.description} ${t.tag}`.toLowerCase().includes(q)) : tasks;
  }, [tasks, search]);

  function statusOf(overId: string | number | undefined): TaskStatus | null {
    if (!overId) return null;
    const s = String(overId);
    if (s.startsWith("col:")) return s.slice(4) as TaskStatus;
    return tasks.find((t) => t.id === s)?.status ?? null;
  }

  function onDragStart(e: DragStartEvent) {
    setActive(tasks.find((t) => t.id === e.active.id) ?? null);
  }

  function onDragOver(e: DragOverEvent) {
    const to = statusOf(e.over?.id);
    const cur = tasks.find((t) => t.id === e.active.id);
    if (!to || !cur || cur.status === to) return;
    setTasks((all) => all.map((t) => (t.id === cur.id ? { ...t, status: to } : t)));
  }

  function onDragEnd(e: DragEndEvent) {
    setActive(null);
    const cur = tasks.find((t) => t.id === e.active.id);
    const to = statusOf(e.over?.id);
    if (!cur || !to) return;
    const col = tasks.filter((t) => t.status === to && t.id !== cur.id);
    let idx = col.length;
    const overId = String(e.over?.id ?? "");
    if (!overId.startsWith("col:")) {
      const oi = col.findIndex((t) => t.id === overId);
      if (oi >= 0) idx = oi;
    }
    const before = col[idx - 1]?.position;
    const after = col[idx]?.position;
    const position =
      before === undefined && after === undefined ? Date.now() : before === undefined ? after! - 1000 : after === undefined ? before + 1000 : (before + after) / 2;
    const progress = to === "done" ? 100 : cur.progress;
    setTasks((all) => all.map((t) => (t.id === cur.id ? { ...t, status: to, position, progress } : t)).sort((a, b) => a.position - b.position));
    save.mutate({ id: cur.id, draft: { status: to, position, progress } });
  }

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="canvas-bg min-h-screen p-0 md:p-6">
      <div className="flex min-h-[calc(100vh-3rem)] overflow-hidden bg-surface md:rounded-[2.5rem] md:shadow-card">
        <nav className="hidden w-20 flex-col items-center bg-rail py-7 text-rail-foreground md:flex">
          <Logo />
          <div className="mt-14 flex flex-col gap-5">
            <button className="flex h-11 w-11 items-center justify-center rounded-full bg-primary shadow-glow" aria-label="Board">
              <LayoutGrid className="h-5 w-5" />
            </button>
            <button onClick={() => setChatOpen(true)} className="flex h-11 w-11 items-center justify-center rounded-full opacity-80 hover:bg-sidebar-accent hover:opacity-100" aria-label="Open assistant">
              <Bot className="h-5 w-5" />
            </button>
          </div>
          <button onClick={signOut} className="mt-auto flex h-11 w-11 items-center justify-center rounded-full opacity-80 hover:bg-sidebar-accent hover:opacity-100" aria-label="Sign out">
            <LogOut className="h-5 w-5" />
          </button>
        </nav>

        <main className="flex-1 overflow-x-auto p-5 md:p-8">
          <div className="flex items-center gap-4">
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tasks"
                className="w-full rounded-full bg-card py-3 pl-11 pr-4 text-sm shadow-card outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <button onClick={() => setChatOpen(true)} className="ml-auto flex items-center gap-2 rounded-full bg-rail px-4 py-2.5 text-sm font-semibold text-rail-foreground transition hover:-translate-y-0.5">
              <Bot className="h-4 w-4" /> Ask Flo
            </button>
            <button onClick={signOut} className="rounded-full p-2.5 text-muted-foreground hover:bg-muted md:hidden" aria-label="Sign out">
              <LogOut className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-7 flex flex-col gap-6 xl:flex-row">
            <section className="flex-1 rounded-[2rem] bg-card/70 p-6 shadow-card">
              <div className="mb-6 flex items-center justify-between">
                <h1 className="text-3xl font-bold">Tasks</h1>
                <button
                  onClick={() => setDialog({ open: true, task: null, status: "todo" })}
                  className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition hover:-translate-y-0.5"
                >
                  Create Task
                </button>
              </div>
              <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd} onDragCancel={() => { setActive(null); qc.invalidateQueries({ queryKey: ["tasks"] }); }}>
                <div className="flex gap-5 overflow-x-auto pb-2">
                  {COLUMNS.map((col) => {
                    const items = filtered.filter((t) => t.status === col.id);
                    return (
                      <Column key={col.id} id={col.id} title={col.title} count={items.length} onAdd={() => setDialog({ open: true, task: null, status: col.id })}>
                        <SortableContext items={items.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                          {items.map((t) => (
                            <SortableTaskCard
                              key={t.id}
                              task={t}
                              onEdit={() => setDialog({ open: true, task: t, status: t.status })}
                              onDelete={() => remove.mutate(t.id)}
                            />
                          ))}
                        </SortableContext>
                        {items.length === 0 && (
                          <div className="flex flex-1 items-center justify-center rounded-3xl border-2 border-dashed p-8 text-center text-sm text-muted-foreground">
                            Drop tasks here
                          </div>
                        )}
                      </Column>
                    );
                  })}
                </div>
                <DragOverlay>{active ? <TaskCardView task={active} overlay /> : null}</DragOverlay>
              </DndContext>
            </section>
            <StatsPanel tasks={tasks} />
          </div>
        </main>
      </div>

      <TaskDialog
        open={dialog.open}
        onOpenChange={(o) => setDialog((d) => ({ ...d, open: o }))}
        initial={dialog.task}
        defaultStatus={dialog.status}
        onSave={(draft) => save.mutate({ id: dialog.task?.id, draft })}
      />

      <div
        className={cn(
          "fixed inset-y-0 right-0 z-40 w-full max-w-md bg-card shadow-lift transition-transform duration-300 md:inset-y-4 md:right-4 md:overflow-hidden md:rounded-[2rem]",
          chatOpen ? "translate-x-0" : "translate-x-[110%]",
        )}
      >
        {chatOpen && <ChatPanel onClose={() => setChatOpen(false)} />}
      </div>
    </div>
  );
}
