/**
 * TaskNote parsing and CRUD — reads/writes Obsidian TaskNote files.
 *
 * TaskNotes are markdown files in TaskNotes/ with YAML frontmatter
 * containing task metadata (status, priority, due, client, etc).
 */

import * as path from "node:path";
import { readVaultFile, writeVaultFile, getVaultRoot } from "./vault";
import { parseNote, serializeNote, getString, getStringArray } from "./parser";
import { scanVault } from "./scanner";
import { formatDateET } from "@/lib/utils/dates";
import type { TaskNote, TaskStatus, TaskPriority } from "@/types/task";

const VALID_STATUSES: TaskStatus[] = [
  "open",
  "in-progress",
  "waiting",
  "done",
  "cancelled",
];
const VALID_PRIORITIES: TaskPriority[] = ["critical", "high", "medium", "low"];

/**
 * Parse a single TaskNote from file content + path.
 */
export function parseTaskNote(
  filePath: string,
  content: string
): TaskNote {
  const parsed = parseNote(content);
  const fm = parsed.frontmatter;

  const rawStatus = getString(fm, "status") ?? "open";
  const rawPriority = getString(fm, "priority") ?? "medium";

  return {
    id: path.basename(filePath, ".md"),
    filePath,
    title:
      getString(fm, "title") ??
      path.basename(filePath, ".md").replace(/^TaskNote-/, "").replace(/-/g, " "),
    status: VALID_STATUSES.includes(rawStatus as TaskStatus)
      ? (rawStatus as TaskStatus)
      : "open",
    priority: VALID_PRIORITIES.includes(rawPriority as TaskPriority)
      ? (rawPriority as TaskPriority)
      : "medium",
    due: getString(fm, "due"),
    scheduled: getString(fm, "scheduled"),
    completed: getString(fm, "completed"),
    created: getString(fm, "created") ?? formatDateET(),
    source: getString(fm, "source"),
    client: getString(fm, "client"),
    project_code: getString(fm, "project_code"),
    waitingOn: getString(fm, "waitingOn"),
    tags: getStringArray(fm, "tags"),
    body: parsed.body,
  };
}

/**
 * List all tasks from the vault scanner results.
 */
export async function listTasks(): Promise<TaskNote[]> {
  const root = getVaultRoot();
  const scan = await scanVault(root);

  // Filter to TaskNotes directory
  const taskFiles = scan.files.filter((f) =>
    f.relativePath.startsWith("TaskNotes/")
  );

  const tasks: TaskNote[] = [];
  for (const file of taskFiles) {
    try {
      const content = await readVaultFile(file.path);
      tasks.push(parseTaskNote(file.path, content));
    } catch {
      // Skip files that can't be read
      continue;
    }
  }

  return tasks;
}

/**
 * Get a single task by ID (filename without extension).
 */
export async function getTask(taskId: string): Promise<TaskNote | null> {
  const root = getVaultRoot();
  const filePath = `${root}/TaskNotes/${taskId}.md`;
  try {
    const content = await readVaultFile(filePath);
    return parseTaskNote(filePath, content);
  } catch {
    return null;
  }
}

/**
 * Update task properties. Merges provided fields into existing frontmatter.
 */
export async function updateTask(
  taskId: string,
  updates: Partial<Omit<TaskNote, "id" | "filePath">>
): Promise<{ success: boolean; error?: string }> {
  const root = getVaultRoot();
  const filePath = `${root}/TaskNotes/${taskId}.md`;

  try {
    const content = await readVaultFile(filePath);
    const parsed = parseNote(content);
    const fm = { ...parsed.frontmatter };

    // Apply updates to frontmatter
    if (updates.title !== undefined) fm.title = updates.title;
    if (updates.status !== undefined) fm.status = updates.status;
    if (updates.priority !== undefined) fm.priority = updates.priority;
    if (updates.due !== undefined) fm.due = updates.due;
    if (updates.scheduled !== undefined) fm.scheduled = updates.scheduled;
    if (updates.completed !== undefined) fm.completed = updates.completed;
    if (updates.source !== undefined) fm.source = updates.source;
    if (updates.client !== undefined) fm.client = updates.client;
    if (updates.project_code !== undefined) fm.project_code = updates.project_code;
    if (updates.waitingOn !== undefined) fm.waitingOn = updates.waitingOn;
    if (updates.tags !== undefined) fm.tags = updates.tags;

    // Auto-set completed date when marking done
    if (updates.status === "done" && !updates.completed) {
      fm.completed = formatDateET();
    }

    const body = updates.body ?? parsed.body;
    const newContent = serializeNote(fm, body);

    return writeVaultFile(filePath, newContent);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * Create a new task. Returns the task ID.
 */
export async function createTask(
  task: Omit<TaskNote, "id" | "filePath">
): Promise<{ success: boolean; taskId?: string; error?: string }> {
  const root = getVaultRoot();

  // Generate ID from title
  const id =
    "TaskNote-" +
    task.title
      .replace(/[^a-zA-Z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 60);

  const filePath = `${root}/TaskNotes/${id}.md`;

  const fm: Record<string, unknown> = {
    title: task.title,
    status: task.status,
    priority: task.priority,
    created: task.created || formatDateET(),
  };

  if (task.due) fm.due = task.due;
  if (task.scheduled) fm.scheduled = task.scheduled;
  if (task.source) fm.source = task.source;
  if (task.client) fm.client = task.client;
  if (task.project_code) fm.project_code = task.project_code;
  if (task.waitingOn) fm.waitingOn = task.waitingOn;
  if (task.tags && task.tags.length > 0) fm.tags = task.tags;

  const content = serializeNote(fm, task.body || "");
  const result = await writeVaultFile(filePath, content);

  return { ...result, taskId: result.success ? id : undefined };
}

/**
 * Filter tasks by various criteria.
 */
export function filterTasks(
  tasks: TaskNote[],
  filters: {
    status?: TaskStatus[];
    priority?: TaskPriority[];
    client?: string;
    overdue?: boolean;
  }
): TaskNote[] {
  return tasks.filter((t) => {
    if (filters.status && !filters.status.includes(t.status)) return false;
    if (filters.priority && !filters.priority.includes(t.priority)) return false;
    if (filters.client && t.client !== filters.client) return false;
    if (filters.overdue) {
      if (!t.due) return false;
      const dueDate = new Date(t.due);
      if (dueDate >= new Date()) return false;
      if (t.status === "done" || t.status === "cancelled") return false;
    }
    return true;
  });
}

/**
 * Sort tasks by priority (critical first) then due date (soonest first).
 */
export function sortTasks(tasks: TaskNote[]): TaskNote[] {
  const priorityOrder: Record<TaskPriority, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };

  return [...tasks].sort((a, b) => {
    const pa = priorityOrder[a.priority];
    const pb = priorityOrder[b.priority];
    if (pa !== pb) return pa - pb;
    // Sort by due date (no due = last)
    if (a.due && b.due) return a.due.localeCompare(b.due);
    if (a.due) return -1;
    if (b.due) return 1;
    return 0;
  });
}
