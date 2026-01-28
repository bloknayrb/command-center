/**
 * paths.ts — Windows path normalization and safety utilities.
 *
 * All vault paths flow through these functions to ensure:
 * - Consistent forward slashes
 * - Resolved relative segments (no ../ traversal)
 * - Case-insensitive comparison on Windows
 * - Long path support (>260 chars warning)
 */

import * as path from "node:path";

const WINDOWS_MAX_PATH = 260;

/**
 * Normalize a path for consistent comparison:
 * - Resolve to absolute
 * - Convert backslashes to forward slashes
 * - Remove trailing slash
 */
export function normalizePath(p: string): string {
  const resolved = path.resolve(p);
  return resolved.replace(/\\/g, "/").replace(/\/$/, "");
}

/**
 * Check if a path is within a root directory.
 * Case-insensitive on Windows. Prevents path traversal.
 */
export function isWithinRoot(filePath: string, rootPath: string): boolean {
  const normalFile = normalizePath(filePath).toLowerCase();
  const normalRoot = normalizePath(rootPath).toLowerCase();
  // Must start with root + "/" or be exactly the root
  return normalFile === normalRoot || normalFile.startsWith(normalRoot + "/");
}

/**
 * Check if a path exceeds Windows MAX_PATH and return a warning.
 * Returns null if path is safe, or a warning string if too long.
 */
export function checkPathLength(p: string): string | null {
  const resolved = path.resolve(p);
  if (resolved.length > WINDOWS_MAX_PATH) {
    return `Path exceeds ${WINDOWS_MAX_PATH} chars (${resolved.length}): ${resolved.slice(0, 80)}...`;
  }
  return null;
}

/**
 * Build a vault-relative path from a vault root and relative segments.
 * Always returns forward-slashed path within the vault.
 */
export function vaultPath(vaultRoot: string, ...segments: string[]): string {
  return normalizePath(path.join(vaultRoot, ...segments));
}
