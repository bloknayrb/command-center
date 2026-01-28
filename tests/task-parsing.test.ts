/**
 * TaskNote parsing tests — verify frontmatter parsing and task operations.
 */

import { describe, it, expect } from "vitest";
import { parseTaskNote, filterTasks, sortTasks } from "@/lib/obsidian/tasks";
import type { TaskNote } from "@/types/task";

describe("parseTaskNote", () => {
  it("parses a complete task note", () => {
    const content = `---
title: Review DRPA documentation
status: open
priority: high
due: "2026-02-01"
client: DRPA
project_code: "19088"
created: "2026-01-27"
tags:
  - review
  - documentation
---

Review the latest DRPA contractor submittal.`;

    const task = parseTaskNote("/vault/TaskNotes/TaskNote-Review-DRPA.md", content);

    expect(task.id).toBe("TaskNote-Review-DRPA");
    expect(task.title).toBe("Review DRPA documentation");
    expect(task.status).toBe("open");
    expect(task.priority).toBe("high");
    expect(task.due).toBe("2026-02-01");
    expect(task.client).toBe("DRPA");
    expect(task.project_code).toBe("19088");
    expect(task.tags).toEqual(["review", "documentation"]);
    expect(task.body).toContain("Review the latest");
  });

  it("handles missing frontmatter gracefully", () => {
    const content = "Just a plain markdown file with no frontmatter.";
    const task = parseTaskNote("/vault/TaskNotes/TaskNote-Plain.md", content);

    expect(task.id).toBe("TaskNote-Plain");
    expect(task.status).toBe("open"); // default
    expect(task.priority).toBe("medium"); // default
  });

  it("derives title from filename when not in frontmatter", () => {
    const content = "---\nstatus: open\n---\nSome content";
    const task = parseTaskNote("/vault/TaskNotes/TaskNote-My-Task.md", content);

    expect(task.title).toBe("My Task");
  });

  it("handles invalid status gracefully", () => {
    const content = "---\nstatus: bogus\n---\nContent";
    const task = parseTaskNote("/vault/TaskNotes/task.md", content);
    expect(task.status).toBe("open"); // fallback
  });
});

describe("filterTasks", () => {
  const tasks: TaskNote[] = [
    makeMockTask({ id: "t1", status: "open", priority: "high", client: "DRPA", due: "2026-01-20" }),
    makeMockTask({ id: "t2", status: "done", priority: "medium", client: "VDOT" }),
    makeMockTask({ id: "t3", status: "open", priority: "low", client: "DRPA" }),
    makeMockTask({ id: "t4", status: "waiting", priority: "critical", client: "MDTA", due: "2026-03-01" }),
  ];

  it("filters by status", () => {
    const result = filterTasks(tasks, { status: ["open"] });
    expect(result).toHaveLength(2);
    expect(result.every((t) => t.status === "open")).toBe(true);
  });

  it("filters by priority", () => {
    const result = filterTasks(tasks, { priority: ["high", "critical"] });
    expect(result).toHaveLength(2);
  });

  it("filters by client", () => {
    const result = filterTasks(tasks, { client: "DRPA" });
    expect(result).toHaveLength(2);
  });

  it("filters overdue tasks", () => {
    const result = filterTasks(tasks, { overdue: true });
    // t1 is overdue (due 2026-01-20, before today), t4 is not (2026-03-01)
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("t1");
  });

  it("combines filters", () => {
    const result = filterTasks(tasks, { status: ["open"], client: "DRPA" });
    expect(result).toHaveLength(2);
  });
});

describe("sortTasks", () => {
  const tasks: TaskNote[] = [
    makeMockTask({ priority: "low", due: "2026-02-01" }),
    makeMockTask({ priority: "critical", due: "2026-03-01" }),
    makeMockTask({ priority: "high", due: "2026-01-28" }),
    makeMockTask({ priority: "high", due: "2026-01-25" }),
  ];

  it("sorts by priority first, then due date", () => {
    const sorted = sortTasks(tasks);
    expect(sorted[0].priority).toBe("critical");
    expect(sorted[1].priority).toBe("high");
    expect(sorted[1].due).toBe("2026-01-25"); // earlier due date first
    expect(sorted[2].priority).toBe("high");
    expect(sorted[2].due).toBe("2026-01-28");
    expect(sorted[3].priority).toBe("low");
  });
});

// Helper to create mock tasks for testing
function makeMockTask(overrides: Partial<TaskNote> = {}): TaskNote {
  return {
    id: "test-task",
    filePath: "/vault/TaskNotes/test-task.md",
    title: "Test Task",
    status: "open",
    priority: "medium",
    created: "2026-01-27",
    body: "Test body",
    tags: [],
    ...overrides,
  };
}
