/**
 * PIP evidence generation — produces weekly status reports.
 *
 * Queries completed tasks, groups by client, and formats as
 * copy-pasteable markdown for PIP check-in evidence.
 */

import { listTasks, filterTasks } from "@/lib/obsidian/tasks";
import { getCurrentWeekRange, formatDateET } from "@/lib/utils/dates";
import { config } from "@/config/app.config";
import type { TaskNote } from "@/types/task";

export interface WeeklyReport {
  /** Formatted markdown string */
  markdown: string;
  /** Date range */
  dateRange: { start: string; end: string };
  /** Tasks included */
  taskCount: number;
  /** Clients represented */
  clients: string[];
}

/**
 * Generate a weekly status report for the given date range.
 *
 * Groups completed tasks by client and formats as markdown
 * suitable for pasting into an email or PIP evidence doc.
 */
export async function generateWeeklyReport(
  startDate?: string,
  endDate?: string
): Promise<WeeklyReport> {
  // Default to current week
  const range = getCurrentWeekRange();
  const start = startDate ?? range.monday;
  const end = endDate ?? range.friday;

  // Get all tasks
  const allTasks = await listTasks();

  // Filter to completed tasks within date range
  const completedTasks = allTasks.filter((t) => {
    if (t.status !== "done") return false;
    const completed = t.completed ?? "";
    return completed >= start && completed <= end;
  });

  // Group by client
  const byClient = groupByClient(completedTasks);

  // Format markdown
  const markdown = formatReport(start, end, byClient, completedTasks.length);

  return {
    markdown,
    dateRange: { start, end },
    taskCount: completedTasks.length,
    clients: Object.keys(byClient),
  };
}

/**
 * Generate a full PIP check-in evidence package.
 */
export async function generateCheckinEvidence(
  startDate: string,
  endDate: string
): Promise<string> {
  const allTasks = await listTasks();

  // Tasks completed in the period
  const completed = allTasks.filter((t) => {
    if (t.status !== "done") return false;
    const d = t.completed ?? "";
    return d >= startDate && d <= endDate;
  });

  // Active tasks
  const active = filterTasks(allTasks, {
    status: ["open", "in-progress", "waiting"],
  });

  const sections: string[] = [
    `# PIP Check-in Evidence: ${startDate} – ${endDate}`,
    `Generated: ${formatDateET()}`,
    "",
  ];

  // Completed work by category
  sections.push("## Completed Work");
  const byClient = groupByClient(completed);
  for (const [client, tasks] of Object.entries(byClient)) {
    sections.push(`### ${client}`);
    for (const task of tasks) {
      const dueStr = task.due ? ` (due: ${task.due})` : "";
      sections.push(`- ${task.title}${dueStr}`);
    }
    sections.push("");
  }

  // Summary stats
  sections.push("## Summary");
  sections.push(`- **Tasks completed**: ${completed.length}`);
  sections.push(`- **Active tasks**: ${active.length}`);
  sections.push(
    `- **Projects active**: ${new Set(completed.map((t) => t.client).filter(Boolean)).size}`
  );
  sections.push("");

  // PIP categories
  sections.push("## PIP Categories");
  for (const category of config.pip.categories) {
    sections.push(`### ${category}`);
    sections.push("- [Evidence items to be filled]");
    sections.push("");
  }

  return sections.join("\n");
}

/**
 * Group tasks by client (or "Internal" if no client set).
 */
function groupByClient(
  tasks: TaskNote[]
): Record<string, TaskNote[]> {
  const groups: Record<string, TaskNote[]> = {};
  for (const task of tasks) {
    const client = task.client ?? "Internal";
    if (!groups[client]) groups[client] = [];
    groups[client].push(task);
  }
  return groups;
}

/**
 * Format a weekly report as markdown.
 */
function formatReport(
  start: string,
  end: string,
  byClient: Record<string, TaskNote[]>,
  totalCount: number
): string {
  const lines: string[] = [
    `## Weekly Status Report: ${start} – ${end}`,
    "",
  ];

  if (totalCount === 0) {
    lines.push("No tasks completed in this period.");
    return lines.join("\n");
  }

  for (const [client, tasks] of Object.entries(byClient)) {
    lines.push(`### ${client}`);
    for (const task of tasks) {
      const dueStr = task.due ? ` (due: ${task.due})` : "";
      lines.push(`- ${task.title}${dueStr}`);
    }
    lines.push("");
  }

  const clientCount = Object.keys(byClient).length;
  lines.push("### Summary");
  lines.push(
    `${totalCount} tasks completed | ${clientCount} projects active`
  );

  return lines.join("\n");
}
