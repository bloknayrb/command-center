/**
 * TaskNote types — mirrors the YAML frontmatter in Obsidian TaskNotes.
 */

export interface TaskNote {
  /** File name without extension */
  id: string;
  /** Full file path */
  filePath: string;
  /** Task title (from filename or frontmatter) */
  title: string;
  /** Frontmatter properties */
  status: TaskStatus;
  priority: TaskPriority;
  due?: string;
  scheduled?: string;
  completed?: string;
  created: string;
  source?: string;
  client?: string;
  project_code?: string;
  waitingOn?: string;
  tags?: string[];
  /** Markdown body content */
  body: string;
}

export type TaskStatus =
  | "open"
  | "in-progress"
  | "waiting"
  | "done"
  | "cancelled";

export type TaskPriority = "critical" | "high" | "medium" | "low";
