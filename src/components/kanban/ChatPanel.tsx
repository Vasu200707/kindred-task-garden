import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useQueryClient } from "@tanstack/react-query";
import { Bot, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { PromptInput, PromptInputFooter, PromptInputSubmit, PromptInputTextarea } from "@/components/ai-elements/prompt-input";
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput } from "@/components/ai-elements/tool";
import { Shimmer } from "@/components/ai-elements/shimmer";

const toolTitles: Record<string, string> = {
  "tool-list_tasks": "Reading your board",
  "tool-create_task": "Creating a task",
  "tool-update_task": "Updating a task",
  "tool-move_task": "Moving a task",
  "tool-delete_task": "Deleting a task",
};

export function ChatPanel({ onClose }: { onClose: () => void }) {
  const [initial, setInitial] = useState<UIMessage[] | null>(null);
  useEffect(() => {
    supabase
      .from("chat_messages")
      .select("message_id,role,parts")
      .order("created_at")
      .then(({ data, error }) => {
        if (error) toast.error("Couldn't load chat history");
        setInitial(
          (data ?? []).map((r) => ({ id: r.message_id, role: r.role as UIMessage["role"], parts: r.parts as UIMessage["parts"] })),
        );
      });
  }, []);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b px-5 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rail text-rail-foreground">
          <Bot className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="font-bold">Flo</p>
          <p className="text-xs text-muted-foreground">Your board assistant</p>
        </div>
        <button onClick={onClose} className="rounded-xl p-2 text-muted-foreground hover:bg-muted" aria-label="Close chat">
          <X className="h-4 w-4" />
        </button>
      </div>
      {initial === null ? (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">Loading…</div>
      ) : (
        <ChatBody initial={initial} />
      )}
    </div>
  );
}

function ChatBody({ initial }: { initial: UIMessage[] }) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        headers: async (): Promise<Record<string, string>> => {
          const { data } = await supabase.auth.getSession();
          return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {};
        },
      }),
    [],
  );
  const { messages, sendMessage, status, stop, setMessages } = useChat({
    id: "main",
    messages: initial,
    transport,
    onError: (e) => {
      const m = e.message || "";
      if (m.includes("429")) toast.error("Too many requests — try again in a moment.");
      else if (m.includes("402")) toast.error("AI credits are used up for this workspace.");
      else toast.error(m || "The assistant couldn't respond.");
    },
    onFinish: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      inputRef.current?.focus();
    },
  });

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const busy = status === "submitted" || status === "streaming";

  async function clearChat(): Promise<void> {
    const { error } = await supabase.from("chat_messages").delete().neq("message_id", "");
    if (error) { toast.error("Couldn't clear chat"); return; }
    setMessages([]);
  }

  const suggestions = ["What's overdue?", "Add a task to review the design by Friday", "Summarize my board"];

  return (
    <>
      <Conversation className="flex-1">
        <ConversationContent className="gap-5 px-5">
          {messages.length === 0 ? (
            <ConversationEmptyState
              icon={<Bot className="h-8 w-8 text-primary" />}
              title="Ask Flo anything"
              description="I can read, create and move your tasks — or just chat."
            >
              <div className="mt-2 flex flex-col gap-2">
                <Bot className="mx-auto h-8 w-8 text-primary" />
                <p className="font-semibold">Ask Flo anything</p>
                <p className="text-sm text-muted-foreground">I can read, create and move your tasks — or just chat.</p>
                <div className="mt-3 flex flex-col gap-2">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => sendMessage({ text: s })}
                      className="rounded-2xl bg-primary-soft px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-80"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </ConversationEmptyState>
          ) : (
            messages.map((m) => (
              <Message from={m.role} key={m.id}>
                <MessageContent className="group-[.is-user]:bg-primary group-[.is-user]:text-primary-foreground">
                  {m.parts.map((p, i) => {
                    if (p.type === "text") return <MessageResponse key={i}>{p.text}</MessageResponse>;
                    if (p.type.startsWith("tool-")) {
                      const tp = p as Extract<UIMessage["parts"][number], { type: `tool-${string}` }> & {
                        state: never;
                        input?: unknown;
                        output?: unknown;
                        errorText?: string;
                      };
                      return (
                        <Tool key={i} defaultOpen={false}>
                          <ToolHeader type={tp.type as never} state={tp.state} title={toolTitles[p.type] ?? p.type} />
                          <ToolContent>
                            <ToolInput input={tp.input} />
                            <ToolOutput output={tp.output as never} errorText={tp.errorText} />
                          </ToolContent>
                        </Tool>
                      );
                    }
                    return null;
                  })}
                </MessageContent>
              </Message>
            ))
          )}
          {status === "submitted" && (
            <Message from="assistant">
              <MessageContent>
                <Shimmer>Thinking…</Shimmer>
              </MessageContent>
            </Message>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      <div className="border-t p-4">
        <PromptInput
          onSubmit={(msg) => {
            if (!msg.text.trim() || busy) return;
            sendMessage({ text: msg.text });
            setText("");
          }}
        >
          <PromptInputTextarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ask about your tasks…"
          />
          <PromptInputFooter className="justify-between">
            <button
              type="button"
              onClick={clearChat}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
            >
              <Trash2 className="h-3.5 w-3.5" /> Clear
            </button>
            <PromptInputSubmit status={status} onStop={stop} disabled={!busy && !text.trim()} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </>
  );
}
