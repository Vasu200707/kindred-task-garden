import { CalendarClock, Sparkles as _unused } from "lucide-react";
import { format, parseISO } from "date-fns";
import type { Task } from "@/lib/tasks";
import { cn } from "@/lib/utils";

void _unused;

export function StatsPanel({ tasks }: { tasks: Task[] }) {
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === "done").length;
  const doing = tasks.filter((t) => t.status === "in_progress").length;
  const todo = tasks.filter((t) => t.status === "todo").length;
  const pct = total ? Math.round(tasks.reduce((s, t) => s + (t.status === "done" ? 100 : t.progress), 0) / total) : 0;
  const r = 78;
  const c = 2 * Math.PI * r;
  const next = tasks
    .filter((t) => t.due_date && t.status !== "done")
    .sort((a, b) => a.due_date!.localeCompare(b.due_date!))[0];

  const tiles = [
    { label: "Total", value: total, cls: "bg-tag-blue-soft", bar: "bg-tag-blue" },
    { label: "Done", value: done, cls: "bg-ember-soft", bar: "bg-ember" },
    { label: "In progress", value: doing, cls: "bg-tag-pink-soft", bar: "bg-tag-pink" },
    { label: "To do", value: todo, cls: "bg-tag-violet-soft", bar: "bg-primary" },
  ];

  return (
    <aside className="flex w-full flex-col gap-5 xl:w-80">
      <div className="rounded-[2rem] bg-card p-6 shadow-card">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Overall progress</p>
        <div className="relative mx-auto mt-4 h-52 w-52 rounded-full bg-primary-soft p-4">
          <svg viewBox="0 0 180 180" className="h-full w-full -rotate-90">
            <circle cx="90" cy="90" r={r} fill="none" strokeWidth="6" className="stroke-card" />
            <circle
              cx="90"
              cy="90"
              r={r}
              fill="none"
              strokeWidth="6"
              strokeLinecap="round"
              className="stroke-primary transition-all duration-700"
              strokeDasharray={c}
              strokeDashoffset={c - (c * pct) / 100}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-4xl font-extrabold">{pct}%</div>
        </div>
        <h3 className="mt-6 text-lg font-bold">Tasks</h3>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {tiles.map((t) => (
            <div key={t.label} className={cn("rounded-2xl p-4", t.cls)}>
              <p className="text-xs font-semibold uppercase text-muted-foreground">{t.label}</p>
              <div className="mt-1.5 flex items-center gap-2 text-2xl font-bold">
                <span className={cn("h-6 w-1 rounded-full", t.bar)} />
                {t.value}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-4 rounded-[2rem] bg-card p-6 shadow-card">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <CalendarClock className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Next due</p>
          <p className="truncate font-semibold">
            {next ? `${next.title} · ${format(parseISO(next.due_date!), "d MMM")}` : "Nothing scheduled"}
          </p>
        </div>
      </div>
    </aside>
  );
}
