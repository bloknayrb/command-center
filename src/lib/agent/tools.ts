/**
 * Agent tools — vault operations available to the agent.
 *
 * These are registered with the Anthropic SDK as tools that the
 * agent can call during conversations. The executor handles routing
 * tool calls to the actual vault operations.
 */

import type { Tool } from "@anthropic-ai/sdk/resources/messages";
import { listTasks, filterTasks, sortTasks, createTask, updateTask } from "@/lib/obsidian/tasks";
import { scanVault } from "@/lib/obsidian/scanner";
import { readVaultFile } from "@/lib/obsidian/vault";

import type { TaskStatus, TaskPriority } from "@/types/task";

const PIP_ENABLED = process.env.NEXT_PUBLIC_ENABLE_PIP === "true";

function getVaultRoot(): string {
  return process.env.OBSIDIAN_VAULT_PATH ?? "";
}

/**
 * Tool definitions for the Anthropic SDK.
 */
const PIP_TOOL: Tool = {
  name: "generate_pip_report",
  description:
    "Generate a weekly PIP evidence report summarizing completed tasks by client. Returns markdown text suitable for pasting into a PIP check-in document.",
  input_schema: {
    type: "object" as const,
    properties: {
      start_date: {
        type: "string",
        description: "Start date in YYYY-MM-DD format (defaults to current week start)",
      },
      end_date: {
        type: "string",
        description: "End date in YYYY-MM-DD format (defaults to current week end)",
      },
    },
  },
};

export const VAULT_TOOLS: Tool[] = [
  ...(PIP_ENABLED ? [PIP_TOOL] : []),
  {
    name: "list_tasks",
    description:
      "List tasks from the Obsidian vault. Returns TaskNotes with title, status, priority, due date, client, and body. Supports filtering by status, priority, client, and overdue.",
    input_schema: {
      type: "object" as const,
      properties: {
        status: {
          type: "string",
          description:
            "Comma-separated statuses to filter: open, in-progress, waiting, done, cancelled",
        },
        priority: {
          type: "string",
          description: "Comma-separated priorities: critical, high, medium, low",
        },
        client: {
          type: "string",
          description: "Client name: DRPA, VDOT, MDTA, DelDOT",
        },
        overdue: {
          type: "boolean",
          description: "If true, only return overdue tasks (past due date, not done)",
        },
      },
    },
  },
  {
    name: "search_vault",
    description:
      "Scan the Obsidian vault hot paths for recent files. Returns file names, paths, and modification times. Use this to find recent emails, Teams messages, meeting notes, or other vault content.",
    input_schema: {
      type: "object" as const,
      properties: {
        since: {
          type: "string",
          description:
            "ISO date string to filter files modified after this time (e.g. '2026-01-27T00:00:00')",
        },
        category: {
          type: "string",
          enum: ["emails", "teams", "meetings", "tasks", "all"],
          description: "Filter to a specific category of files",
        },
      },
    },
  },
  {
    name: "read_file",
    description:
      "Read the full content of a file from the Obsidian vault. Use this to read task details, email content, meeting notes, etc.",
    input_schema: {
      type: "object" as const,
      properties: {
        path: {
          type: "string",
          description:
            "Relative path within the vault (e.g. 'TaskNotes/TaskNote-Review-DRPA.md')",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "create_task",
    description:
      "Create a new TaskNote in the Obsidian vault. Returns the created task ID.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: { type: "string", description: "Task title" },
        priority: {
          type: "string",
          enum: ["critical", "high", "medium", "low"],
          description: "Task priority (default: medium)",
        },
        due: {
          type: "string",
          description: "Due date in YYYY-MM-DD format",
        },
        client: {
          type: "string",
          description: "Client name (DRPA, VDOT, MDTA, DelDOT)",
        },
        project_code: {
          type: "string",
          description: "Project code (e.g. '19088')",
        },
        body: {
          type: "string",
          description: "Task description / body content",
        },
      },
      required: ["title"],
    },
  },
  {
    name: "update_task",
    description:
      "Update an existing TaskNote. Can change status, priority, due date, etc.",
    input_schema: {
      type: "object" as const,
      properties: {
        taskId: {
          type: "string",
          description: "Task ID (file name without extension, e.g. 'TaskNote-Review-DRPA')",
        },
        status: {
          type: "string",
          enum: ["open", "in-progress", "waiting", "done", "cancelled"],
        },
        priority: {
          type: "string",
          enum: ["critical", "high", "medium", "low"],
        },
        due: { type: "string", description: "Due date in YYYY-MM-DD format" },
      },
      required: ["taskId"],
    },
  },
];

/**
 * Execute a tool call and return the result as a string.
 */
export async function executeTool(
  name: string,
  input: Record<string, unknown>
): Promise<string> {
  try {
    switch (name) {
      case "list_tasks": {
        const allTasks = await listTasks();
        const statusArr = input.status
          ? (input.status as string).split(",").map((s) => s.trim()) as TaskStatus[]
          : undefined;
        const priorityArr = input.priority
          ? (input.priority as string).split(",").map((s) => s.trim()) as TaskPriority[]
          : undefined;
        const filtered = filterTasks(allTasks, {
          status: statusArr,
          priority: priorityArr,
          client: (input.client as string) ?? undefined,
          overdue: (input.overdue as boolean) ?? undefined,
        });
        const sorted = sortTasks(filtered);

        if (sorted.length === 0) return "No tasks match the given filters.";

        const lines = sorted.map((t) => {
          const parts = [`**${t.title}**`];
          parts.push(`Status: ${t.status}`);
          parts.push(`Priority: ${t.priority}`);
          if (t.due) parts.push(`Due: ${t.due}`);
          if (t.client) parts.push(`Client: ${t.client}`);
          if (t.project_code) parts.push(`Project: ${t.project_code}`);
          return parts.join(" | ");
        });

        return `Found ${sorted.length} tasks:\n\n${lines.join("\n")}`;
      }

      case "search_vault": {
        const vaultRoot = getVaultRoot();
        if (!vaultRoot) return "Error: OBSIDIAN_VAULT_PATH not configured";

        const result = await scanVault(vaultRoot);
        let files = result.files;

        // Filter by since date
        if (input.since) {
          const sinceDate = new Date(input.since as string);
          if (!isNaN(sinceDate.getTime())) {
            files = files.filter((f) => f.mtime >= sinceDate);
          }
        }

        // Filter by category
        const category = input.category as string | undefined;
        if (category && category !== "all") {
          const prefixMap: Record<string, string> = {
            emails: "Emails/",
            teams: "TeamsChats/",
            meetings: "Calendar/",
            tasks: "TaskNotes/",
          };
          const prefix = prefixMap[category];
          if (prefix) {
            files = files.filter((f) => f.relativePath.startsWith(prefix));
          }
        }

        if (files.length === 0) return "No files found matching the criteria.";

        const lines = files.slice(0, 50).map(
          (f) => `- ${f.name} (${f.relativePath}) — modified ${f.mtime.toISOString()}`
        );

        return `Found ${files.length} files (showing first ${Math.min(files.length, 50)}):\n\n${lines.join("\n")}`;
      }

      case "read_file": {
        const vaultRoot = getVaultRoot();
        if (!vaultRoot) return "Error: OBSIDIAN_VAULT_PATH not configured";

        const relPath = input.path as string;
        if (!relPath) return "Error: path is required";

        // readVaultFile expects an absolute path
        const fullPath = `${vaultRoot}/${relPath}`;
        try {
          const content = await readVaultFile(fullPath);
          // Truncate very long files
          if (content.length > 4000) {
            return content.slice(0, 4000) + "\n\n[...truncated, file is very long]";
          }
          return content;
        } catch {
          return `File not found or unreadable: ${relPath}`;
        }
      }

      case "create_task": {
        const title = input.title as string;
        if (!title) return "Error: title is required";

        const result = await createTask({
          title,
          status: "open",
          priority: (input.priority as TaskPriority) ?? "medium",
          due: (input.due as string) ?? undefined,
          client: (input.client as string) ?? undefined,
          project_code: (input.project_code as string) ?? undefined,
          created: new Date().toISOString().split("T")[0],
          body: (input.body as string) ?? "",
          tags: [],
        });

        if (!result.success) return `Error creating task: ${result.error}`;
        return `Task created: ${result.taskId}`;
      }

      case "update_task": {
        const taskId = input.taskId as string;
        if (!taskId) return "Error: taskId is required";

        const updates: Record<string, unknown> = {};
        if (input.status) updates.status = input.status;
        if (input.priority) updates.priority = input.priority;
        if (input.due) updates.due = input.due;

        const result = await updateTask(taskId, updates);
        if (!result.success) return `Error updating task: ${result.error}`;
        return `Task updated: ${taskId}`;
      }

      case "generate_pip_report": {
        if (!PIP_ENABLED) return "PIP feature is not enabled.";
        // Dynamic import — PIP source files may not exist in all environments
        const { generateWeeklyReport } = await import("@/lib/pip/evidence");
        const report = await generateWeeklyReport(
          (input.start_date as string) ?? undefined,
          (input.end_date as string) ?? undefined
        );
        return report.markdown;
      }

      default:
        return `Unknown tool: ${name}`;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return `Tool error: ${msg}`;
  }
}
