/**
 * Task filter parsing — shared between agent tools and API routes.
 *
 * Normalizes different input shapes (Record<string, unknown> from tools,
 * URLSearchParams from routes) into a consistent filter object.
 */

import type { TaskStatus, TaskPriority } from "@/types/task";

export interface TaskFilterParams {
  status?: TaskStatus[];
  priority?: TaskPriority[];
  client?: string;
  overdue?: boolean;
}

/**
 * Parse task filters from a generic params object (agent tool input).
 */
export function parseTaskFilters(input: Record<string, unknown>): TaskFilterParams {
  return {
    status: input.status
      ? (input.status as string).split(",").map((s) => s.trim()) as TaskStatus[]
      : undefined,
    priority: input.priority
      ? (input.priority as string).split(",").map((s) => s.trim()) as TaskPriority[]
      : undefined,
    client: (input.client as string) ?? undefined,
    overdue: (input.overdue as boolean) ?? undefined,
  };
}

/**
 * Parse task filters from URL search params (API route).
 */
export function parseTaskFiltersFromParams(searchParams: URLSearchParams): TaskFilterParams {
  const statusParam = searchParams.get("status");
  const priorityParam = searchParams.get("priority");
  const client = searchParams.get("client");
  const overdue = searchParams.get("overdue") === "true";

  return {
    status: statusParam
      ? (statusParam.split(",") as TaskStatus[])
      : undefined,
    priority: priorityParam
      ? (priorityParam.split(",") as TaskPriority[])
      : undefined,
    client: client ?? undefined,
    overdue: overdue || undefined,
  };
}

/**
 * Build a create-task payload from a generic input object.
 * Provides consistent defaults.
 */
export function buildCreateTaskPayload(input: {
  title: string;
  status?: string;
  priority?: string;
  due?: string;
  client?: string;
  project_code?: string;
  body?: string;
  source?: string;
}) {
  return {
    title: input.title,
    status: (input.status as TaskStatus | undefined) ?? "open",
    priority: (input.priority as TaskPriority | undefined) ?? "medium",
    due: input.due ?? undefined,
    client: input.client ?? undefined,
    project_code: input.project_code ?? undefined,
    source: input.source ?? undefined,
    created: new Date().toISOString().split("T")[0],
    body: input.body ?? "",
    tags: [],
  };
}
