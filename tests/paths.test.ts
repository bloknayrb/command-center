/**
 * Tests for Windows path normalization and safety utilities.
 */

import { describe, it, expect } from "vitest";
import { normalizePath, isWithinRoot, checkPathLength, vaultPath } from "@/lib/utils/paths";

describe("normalizePath", () => {
  it("converts backslashes to forward slashes", () => {
    const result = normalizePath("C:\\Users\\test\\vault");
    expect(result).not.toContain("\\");
    expect(result).toContain("/");
  });

  it("removes trailing slash", () => {
    const result = normalizePath("C:/Users/test/vault/");
    expect(result).not.toMatch(/\/$/);
  });

  it("resolves relative segments", () => {
    // path.resolve will handle .., producing an absolute path
    const result = normalizePath("C:/Users/test/../other");
    expect(result).toContain("other");
    expect(result).not.toContain("..");
  });
});

describe("isWithinRoot", () => {
  const root = "C:/Users/test/vault";

  it("returns true for files inside root", () => {
    expect(isWithinRoot("C:/Users/test/vault/file.md", root)).toBe(true);
  });

  it("returns true for deeply nested files", () => {
    expect(isWithinRoot("C:/Users/test/vault/a/b/c/file.md", root)).toBe(true);
  });

  it("returns true for root itself", () => {
    expect(isWithinRoot("C:/Users/test/vault", root)).toBe(true);
  });

  it("returns false for parent directory", () => {
    expect(isWithinRoot("C:/Users/test/file.md", root)).toBe(false);
  });

  it("returns false for sibling directory", () => {
    expect(isWithinRoot("C:/Users/test/other/file.md", root)).toBe(false);
  });

  it("is case-insensitive (Windows)", () => {
    expect(isWithinRoot("C:/Users/Test/Vault/file.md", root)).toBe(true);
  });

  it("blocks traversal via ../", () => {
    // path.resolve will resolve this, so the result path won't contain ..
    // but it will resolve to outside the root
    expect(isWithinRoot("C:/Users/test/vault/../escape.md", root)).toBe(false);
  });
});

describe("checkPathLength", () => {
  it("returns null for short paths", () => {
    expect(checkPathLength("C:/short/path.md")).toBeNull();
  });

  it("returns warning for paths exceeding 260 chars", () => {
    const longPath = "C:/" + "a".repeat(300) + "/file.md";
    const result = checkPathLength(longPath);
    expect(result).not.toBeNull();
    expect(result).toContain("260");
  });
});

describe("vaultPath", () => {
  it("joins vault root with segments", () => {
    const result = vaultPath("C:/vault", "TaskNotes", "task-1.md");
    expect(result).toContain("TaskNotes");
    expect(result).toContain("task-1.md");
    expect(result).not.toContain("\\");
  });
});
