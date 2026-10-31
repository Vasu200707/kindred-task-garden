import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { createOpenAI } from "@ai-sdk/openai";
import { convertToModelMessages, stepCountIs, streamText, tool, type UIMessage } from "ai";
import { z } from "zod/v4";
import type { Database } from "@/integrations/supabase/types";
import {
  createLovableAiGatewayRunIdFetch,
  getLovableAiGatewayRunId,
  withLovableAiGatewayRunIdHeader,
} from "@/lib/ai/run-id.server";

const statusEnum = z.enum(["todo", "in_progress", "done"]);
const colorEnum = z.enum(["blue", "orange", "violet", "pink", "green"]);

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
        if (!token) return new Response("Unauthorized", { status: 401 });
        const url = process.env["SUPABASE_URL"]!;
        const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
        const supabase = createClient<Database>(url, key, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: {
            fetch: (input, init) => {
              const h = new Headers(init?.headers);
              h.set("apikey", key);
              h.set("Authorization", `Bearer ${token}`);
              return fetch(input, { ...init, headers: h });
            },
          },
        });
        const { data: userData, error: userErr } = await supabase.auth.getUser(token);
        if (userErr || !userData.user) return new Response("Unauthorized", { status: 401 });
        const userId = userData.user.id;

        let body: { messages?: UIMessage[] };
        try {
          body = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        const messages = Array.isArray(body.messages) ? body.messages.slice(-60) : [];
        if (messages.length === 0) return new Response("No messages", { status: 400 });

        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return new Response("AI is not configured", { status: 500 });

        const runIdFetch = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(request));
        const provider = createOpenAI({
          baseURL: "https://ai.gateway.lovable.dev/v1",
          apiKey,
          headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
          fetch: runIdFetch.fetch,
        });

        const tools = {
          list_tasks: tool({
            description: "List all of the user's tasks on their Kanban board.",
            inputSchema: z.object({}),
            execute: async () => {
              const { data, error } = await supabase
                .from("tasks")
                .select("id,title,description,status,tag,progress,due_date")
                .order("position");
              if (error) return { error: error.message };
              return { tasks: data };
            },
          }),
          create_task: tool({
            description: "Create a new task on the board.",
            inputSchema: z.object({
              title: z.string(),
              description: z.string().nullable(),
              status: statusEnum.nullable(),
              tag: z.string().nullable(),
              tag_color: colorEnum.nullable(),
              progress: z.number().int().min(0).max(100).nullable(),
              due_date: z.string().nullable().describe("YYYY-MM-DD"),
            }),
            execute: async (i) => {
              const { data, error } = await supabase
                .from("tasks")
                .insert({
                  user_id: userId,
                  title: i.title,
                  description: i.description ?? "",
                  status: i.status ?? "todo",
                  tag: i.tag ?? "General",
                  tag_color: i.tag_color ?? "violet",
                  progress: i.progress ?? 0,
                  due_date: i.due_date,
                  position: Date.now(),
                })
                .select("id,title,status")
                .single();
              if (error) return { error: error.message };
              return { created: data };
            },
          }),
          update_task: tool({
            description: "Update fields of an existing task. Pass null for fields you don't change.",
            inputSchema: z.object({
              id: z.string(),
              title: z.string().nullable(),
              description: z.string().nullable(),
              tag: z.string().nullable(),
              tag_color: colorEnum.nullable(),
              progress: z.number().int().min(0).max(100).nullable(),
              due_date: z.string().nullable(),
            }),
            execute: async ({ id, ...rest }) => {
              const patch = Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== null));
              const { data, error } = await supabase
                .from("tasks")
                .update({ ...patch, updated_at: new Date().toISOString() })
                .eq("id", id)
                .select("id,title")
                .single();
              if (error) return { error: error.message };
              return { updated: data };
            },
          }),
          move_task: tool({
            description: "Move a task to another column.",
            inputSchema: z.object({ id: z.string(), status: statusEnum }),
            execute: async ({ id, status }) => {
              const { data, error } = await supabase
                .from("tasks")
                .update({
                  status,
                  position: Date.now(),
                  ...(status === "done" ? { progress: 100 } : {}),
                })
                .eq("id", id)
                .select("id,title,status")
                .single();
              if (error) return { error: error.message };
              return { moved: data };
            },
          }),
          delete_task: tool({
            description: "Delete a task. Only do this when the user clearly asks.",
            inputSchema: z.object({ id: z.string() }),
            execute: async ({ id }) => {
              const { error } = await supabase.from("tasks").delete().eq("id", id);
              if (error) return { error: error.message };
              return { deleted: id };
            },
          }),
        };

        const result = streamText({
          model: provider.responses("openai/gpt-6-astra"),
          instructions: `You are Flo, a friendly assistant inside a Kanban app with columns To Do (todo), In Progress (in_progress) and Done (done). Today is ${new Date().toISOString().slice(0, 10)}. Use tools to read, create, update or move the user's tasks; call list_tasks first when you need task ids. You can also answer general questions. Be concise and use markdown.`,
          messages: await convertToModelMessages(messages),
          tools,
          stopWhen: stepCountIs(8),
          abortSignal: request.signal,
          providerOptions: {
            openai: {
              store: false,
              forceReasoning: true,
              reasoningEffort: "low",
              reasoningSummary: "auto",
              include: ["reasoning.encrypted_content"],
            },
          },
        });

        const response = result.toUIMessageStreamResponse({
          originalMessages: messages,
          sendReasoning: true,
          onFinish: async ({ messages: all }) => {
            const rows = all.map((m) => ({
              user_id: userId,
              message_id: m.id,
              role: m.role,
              parts: JSON.parse(JSON.stringify(m.parts)),
            }));
            const { error } = await supabase
              .from("chat_messages")
              .upsert(rows, { onConflict: "user_id,message_id" });
            if (error) console.error("Failed to save chat", error);
          },
        });
        return withLovableAiGatewayRunIdHeader(response, runIdFetch);
      },
    },
  },
});
