/**
 * Task utility functions shared across dashboard components.
 */

/**
 * Check if a task is overdue: has a due date, is not done/cancelled, and due date is in the past.
 */
export function isTaskOverdue(task: { due?: string | null; status: string }): boolean {
  if (!task.due) return false;
  if (task.status === "done" || task.status === "cancelled") return false;
  return task.due < new Date().toISOString().split("T")[0];
}
