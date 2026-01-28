/**
 * Vault scanner tests — hot-path scoping, recency filters, cache behavior.
 *
 * Uses a mock vault directory structure to verify:
 * - Only configured directories are scanned
 * - Recency filter respects max_age_days
 * - Cache returns same result within TTL
 * - Cache invalidation works
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { scanVault, invalidateCache } from "@/lib/obsidian/scanner";

let mockVault: string;

beforeEach(async () => {
  mockVault = await fs.mkdtemp(path.join(os.tmpdir(), "cc-vault-test-"));
  invalidateCache();

  // Create mock vault structure
  await fs.mkdir(path.join(mockVault, "TaskNotes"), { recursive: true });
  await fs.mkdir(path.join(mockVault, "01-Projects"), { recursive: true });
  await fs.mkdir(path.join(mockVault, "Calendar"), { recursive: true });
  await fs.mkdir(path.join(mockVault, "Emails"), { recursive: true });
  await fs.mkdir(path.join(mockVault, "TeamsChats"), { recursive: true });
  await fs.mkdir(path.join(mockVault, "02-Daily Notes"), { recursive: true });
  await fs.mkdir(path.join(mockVault, "99-System"), { recursive: true });
  await fs.mkdir(path.join(mockVault, "06-Career"), { recursive: true }); // excluded

  // Create some test files in always-scan dirs
  await fs.writeFile(
    path.join(mockVault, "TaskNotes", "task-1.md"),
    "---\nstatus: open\n---\nTask 1"
  );
  await fs.writeFile(
    path.join(mockVault, "TaskNotes", "task-2.md"),
    "---\nstatus: done\n---\nTask 2"
  );
  await fs.writeFile(
    path.join(mockVault, "01-Projects", "drpa.md"),
    "DRPA project"
  );
  await fs.writeFile(
    path.join(mockVault, "Calendar", "meeting.md"),
    "Meeting notes"
  );

  // Create recent files in recency-scan dirs
  await fs.writeFile(
    path.join(mockVault, "Emails", "recent-email.md"),
    "Recent email"
  );

  // Create old file (will need to set mtime to past)
  const oldEmailPath = path.join(mockVault, "Emails", "old-email.md");
  await fs.writeFile(oldEmailPath, "Old email");
  // Set mtime to 30 days ago
  const oldDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  await fs.utimes(oldEmailPath, oldDate, oldDate);

  // Create system files
  await fs.writeFile(
    path.join(mockVault, "99-System", "Claude-State.md"),
    "State data"
  );
  await fs.writeFile(
    path.join(mockVault, "99-System", "Active-Projects.md"),
    "Projects data"
  );
  await fs.writeFile(
    path.join(mockVault, "99-System", "Background-Tracking.md"),
    "Tracking data"
  );

  // Create file in excluded dir (should not appear in results)
  await fs.writeFile(
    path.join(mockVault, "06-Career", "old-resume.md"),
    "Old resume"
  );
});

afterEach(async () => {
  await fs.rm(mockVault, { recursive: true, force: true });
});

describe("scanVault", () => {
  it("scans always-scan directories", async () => {
    const result = await scanVault(mockVault);
    const alwaysFiles = result.files.filter((f) => f.source === "always");

    // Should have TaskNotes (2) + 01-Projects (1) + Calendar (1) = 4
    expect(alwaysFiles.length).toBe(4);
    expect(alwaysFiles.some((f) => f.name === "task-1")).toBe(true);
    expect(alwaysFiles.some((f) => f.name === "task-2")).toBe(true);
    expect(alwaysFiles.some((f) => f.name === "drpa")).toBe(true);
    expect(alwaysFiles.some((f) => f.name === "meeting")).toBe(true);
  });

  it("filters recency-scan directories by mtime", async () => {
    const result = await scanVault(mockVault);
    const recencyFiles = result.files.filter((f) => f.source === "recency");

    // Should have recent-email (1) but NOT old-email (>14 days old)
    expect(recencyFiles.some((f) => f.name === "recent-email")).toBe(true);
    expect(recencyFiles.some((f) => f.name === "old-email")).toBe(false);
  });

  it("includes system files", async () => {
    const result = await scanVault(mockVault);
    const systemFiles = result.files.filter((f) => f.source === "system");

    expect(systemFiles.length).toBe(3);
    expect(systemFiles.some((f) => f.name === "Claude-State")).toBe(true);
  });

  it("does NOT scan excluded directories", async () => {
    const result = await scanVault(mockVault);
    const allPaths = result.files.map((f) => f.relativePath);

    expect(allPaths.some((p) => p.includes("06-Career"))).toBe(false);
    expect(allPaths.some((p) => p.includes("old-resume"))).toBe(false);
  });

  it("returns scan duration", async () => {
    const result = await scanVault(mockVault);
    expect(result.scanDuration).toBeGreaterThanOrEqual(0);
    expect(result.scanDuration).toBeLessThan(5000); // Should be fast
  });

  it("caches results within TTL", async () => {
    const first = await scanVault(mockVault);
    const second = await scanVault(mockVault);

    // Second call should return cached result
    expect(second.cachedAt).toBeDefined();
    expect(second.scannedCount).toBe(first.scannedCount);
  });

  it("invalidates cache on demand", async () => {
    await scanVault(mockVault);
    invalidateCache();
    const fresh = await scanVault(mockVault);

    // Fresh scan should not be cached
    expect(fresh.cachedAt).toBeNull();
  });

  it("populates relativePath correctly", async () => {
    const result = await scanVault(mockVault);
    const task = result.files.find((f) => f.name === "task-1");

    expect(task).toBeDefined();
    expect(task!.relativePath).toBe("TaskNotes/task-1.md");
  });
});
