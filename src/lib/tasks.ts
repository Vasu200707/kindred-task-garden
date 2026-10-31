import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type TaskStatus = "todo" | "in_progress" | "done";
export type TagColor = "blue" | "orange" | "violet" | "pink" | "green";

export type Task = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  tag: string;
  tag_color: TagColor;
  progress: number;
  due_date: string | null;
  position: number;
};

export const COLUMNS: { id: TaskStatus; title: string }[] = [
  { id: "todo", title: "To Do" },
  { id: "in_progress", title: "In Progress" },
  { id: "done", title: "Done" },
];

export const TAG_COLORS: TagColor[] = ["blue", "orange", "violet", "pink", "green"];

export const tagClasses: Record<TagColor, string> = {
  blue: "bg-tag-blue-soft text-tag-blue",
  orange: "bg-tag-orange-soft text-tag-orange",
  violet: "bg-tag-violet-soft text-tag-violet",
  pink: "bg-tag-pink-soft text-tag-pink",
  green: "bg-tag-green-soft text-tag-green",
};

export const tasksQuery = queryOptions({
  queryKey: ["tasks"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("tasks")
      .select("id,title,description,status,tag,tag_color,progress,due_date,position")
      .order("position");
    if (error) throw error;
    return data as Task[];
  },
});
