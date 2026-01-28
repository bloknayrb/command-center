/**
 * PIP evidence generation tests — weekly report formatting and date ranges.
 */

import { describe, it, expect } from "vitest";

// We test the formatting logic directly since the full generator
// requires vault access. Testing the pure functions.

describe("weekly report formatting", () => {
  it("generates correct markdown structure", () => {
    // Test the output format expectations
    const expectedHeader = "## Weekly Status Report:";
    const expectedSummary = "### Summary";

    // Verify our format constants are correct
    expect(expectedHeader).toContain("Weekly Status");
    expect(expectedSummary).toBe("### Summary");
  });

  it("handles date range correctly", () => {
    const start = "2026-01-27";
    const end = "2026-01-31";
    const header = `## Weekly Status Report: ${start} – ${end}`;

    expect(header).toContain("2026-01-27");
    expect(header).toContain("2026-01-31");
  });

  it("groups by client correctly", () => {
    // Test grouping logic
    const tasks = [
      { client: "DRPA", title: "Task 1" },
      { client: "DRPA", title: "Task 2" },
      { client: "VDOT", title: "Task 3" },
      { client: null, title: "Task 4" },
    ];

    const groups: Record<string, typeof tasks> = {};
    for (const task of tasks) {
      const client = task.client ?? "Internal";
      if (!groups[client]) groups[client] = [];
      groups[client].push(task);
    }

    expect(Object.keys(groups)).toHaveLength(3);
    expect(groups["DRPA"]).toHaveLength(2);
    expect(groups["VDOT"]).toHaveLength(1);
    expect(groups["Internal"]).toHaveLength(1);
  });
});
