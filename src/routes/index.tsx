import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Bot, Columns3, Save } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Flowboard — Your Kanban board with an AI teammate" },
      { name: "description", content: "Plan tasks across To Do, In Progress and Done, and let an AI assistant create and move them for you." },
      { property: "og:title", content: "Flowboard — Your Kanban board with an AI teammate" },
      { property: "og:description", content: "Plan tasks across To Do, In Progress and Done, and let an AI assistant create and move them for you." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

export function Logo() {
  return (
    <div className="relative h-9 w-9">
      <span className="absolute left-1/2 top-0 h-4 w-4 -translate-x-1/2 rounded-full bg-ember" />
      <span className="absolute bottom-0 left-0 h-4 w-4 rounded-full bg-primary" />
      <span className="absolute bottom-0 right-0 h-4 w-4 rounded-full bg-tag-pink" />
    </div>
  );
}

function Index() {
  const features = [
    { icon: Columns3, title: "Three clear lanes", text: "To Do, In Progress and Done — drag cards between them." },
    { icon: Bot, title: "AI assistant", text: "Ask about your work, or have it add and move tasks for you." },
    { icon: Save, title: "Always saved", text: "Everything is stored in your account, ready when you return." },
  ];
  return (
    <div className="canvas-bg min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <Logo />
          <span className="text-lg font-bold">Flowboard</span>
        </div>
        <Link to="/auth" className="rounded-full px-5 py-2 text-sm font-semibold text-primary hover:bg-primary-soft">
          Sign in
        </Link>
      </header>
      <main className="mx-auto max-w-6xl px-6 pb-24 pt-16 text-center">
        <span className="inline-block rounded-full bg-primary-soft px-4 py-1.5 text-xs font-semibold text-accent-foreground">
          Kanban, with a teammate built in
        </span>
        <h1 className="mx-auto mt-6 max-w-3xl text-5xl font-extrabold leading-tight tracking-tight md:text-6xl">
          Move your work forward, <span className="text-primary">one card at a time.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
          A calm, beautiful board for your projects — and an AI assistant that knows every task on it.
        </p>
        <Link
          to="/board"
          className="mt-9 inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 font-semibold text-primary-foreground shadow-glow transition-transform hover:-translate-y-0.5"
        >
          Open my board <ArrowRight className="h-4 w-4" />
        </Link>
        <div className="mt-20 grid gap-5 text-left md:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-3xl bg-card p-7 shadow-card">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 font-bold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
