import { describe, it, expect, vi, afterEach } from "vitest";
import { isTaskOverdue } from "@/lib/utils/tasks";

describe("isTaskOverdue", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns true for task past due date and not done", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-27T12:00:00Z"));
    expect(isTaskOverdue({ due: "2026-01-20", status: "open" })).toBe(true);
  });

  it("returns false for task with future due date", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-27T12:00:00Z"));
    expect(isTaskOverdue({ due: "2026-02-01", status: "open" })).toBe(false);
  });

  it("returns false for done task even if past due", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-27T12:00:00Z"));
    expect(isTaskOverdue({ due: "2026-01-20", status: "done" })).toBe(false);
  });

  it("returns false for task with no due date", () => {
    expect(isTaskOverdue({ status: "open" })).toBe(false);
  });

  it("returns false for cancelled task", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-27T12:00:00Z"));
    expect(isTaskOverdue({ due: "2026-01-20", status: "cancelled" })).toBe(false);
  });
});
