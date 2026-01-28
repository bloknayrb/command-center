import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { TaskNote, TaskStatus, TaskPriority } from "@/types/task";

interface TasksResponse {
  tasks: TaskNote[];
  total: number;
  scanned: number;
}

interface TaskFilters {
  status?: TaskStatus[];
  priority?: TaskPriority[];
  client?: string;
  overdue?: boolean;
}

function buildQueryString(filters?: TaskFilters): string {
  if (!filters) return "";
  const params = new URLSearchParams();
  if (filters.status?.length) params.set("status", filters.status.join(","));
  if (filters.priority?.length) params.set("priority", filters.priority.join(","));
  if (filters.client) params.set("client", filters.client);
  if (filters.overdue) params.set("overdue", "true");
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function useTasks(filters?: TaskFilters) {
  return useQuery<TasksResponse>({
    queryKey: ["tasks", filters],
    queryFn: async () => {
      const qs = buildQueryString(filters);
      const res = await fetch(`/api/tasks${qs}`);
      if (!res.ok) throw new Error(`Failed to fetch tasks: ${res.status}`);
      return res.json();
    },
    staleTime: 30_000, // 30s
    refetchInterval: 60_000, // auto-refresh every 60s
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (task: {
      title: string;
      status?: TaskStatus;
      priority?: TaskPriority;
      due?: string;
      client?: string;
      project_code?: string;
      source?: string;
      body?: string;
    }) => {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(task),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to create task: ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (update: { taskId: string; [key: string]: unknown }) => {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to update task: ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}
