# Kanban Board with AI Assistant

## What you'll get
A Kanban board styled after your reference: deep indigo sidebar, soft lavender-gray canvas, white rounded cards, violet accents, pastel tags.

- **Sign in / sign up** (email + password). Each person gets their own private board.
- **Three columns:** To Do, In Progress, Done, each with a "+" to add a task.
- **Task cards:** colored tag pill, title/description, progress bar with %, due date, menu (edit / delete).
- **Drag and drop** cards between columns and reorder them; the card tilts and lifts while dragging, like the reference.
- **Right panel:** circular overall-progress ring, stats tiles (Total, Done, In Progress, To Do), next upcoming due date.
- **Search** bar filters cards; "Create Task" button opens a dialog.
- **AI assistant** panel (slide-out chat): ask about your tasks ("what's overdue?"), have it create or move tasks, or ask general questions. One ongoing conversation, saved to your account. Board refreshes live when the AI changes tasks.
- Everything saves automatically to the database, so it's there when you come back.

## Technical details
- Enable Lovable Cloud: email auth; tables `tasks` (user_id, title, description, status, tag, tag_color, progress, due_date, position) and `chat_messages` (user_id, role, parts jsonb); RLS scoped to `auth.uid()`, with grants.
- Routes: `/` public landing with sign-in CTA, `/auth`, `/_authenticated/board`.
- Drag and drop with `@dnd-kit`; optimistic updates via TanStack Query.
- AI: server route `/api/chat` streaming via AI SDK + Lovable AI Gateway (`openai/gpt-6-astra`, Responses API), auth-verified, with tools `list_tasks`, `create_task`, `update_task`, `move_task`; messages persisted in `onFinish`. Chat UI built with AI Elements, markdown rendering.
- Design tokens in `src/styles.css` (oklch), fonts Plus Jakarta Sans.
