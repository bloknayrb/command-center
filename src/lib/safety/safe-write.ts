/**
 * safe-write.ts — Windows-first atomic file writes with OneDrive retry.
 *
 * Key design decisions (from QA review):
 * - Uses copy+delete instead of fs.rename() (NOT atomic on Windows)
 * - Exponential backoff on EACCES/EBUSY (OneDrive file locking)
 * - Writes to .tmp file first, then copies to target, then deletes .tmp
 * - Keeps last N backups per file
 * - Validates all paths stay within vault root (path traversal prevention)
 * - .tmp files placed in same directory (avoids cross-device issues)
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { normalizePath, isWithinRoot } from "@/lib/utils/paths";

const MAX_BACKUPS = 5;
const RETRY_DELAYS = [200, 400, 800, 1600]; // ms, exponential backoff
const RETRYABLE_CODES = new Set(["EACCES", "EBUSY", "EPERM"]);

export interface SafeWriteOptions {
  /** Root directory that all paths must stay within */
  vaultRoot: string;
  /** Create backups before overwriting (default: true) */
  backup?: boolean;
  /** Max number of backups to keep (default: 5) */
  maxBackups?: number;
}

export interface SafeWriteResult {
  success: boolean;
  backupPath?: string;
  error?: string;
}

/**
 * Check if a Node.js error has a `code` property (e.g., EACCES, ENOENT).
 */
function isNodeError(err: unknown): err is NodeJS.ErrnoException {
  return err instanceof Error && "code" in err;
}

/**
 * Sleep for the given number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Write a file atomically with backup and OneDrive retry.
 *
 * Strategy:
 * 1. Validate path is within vault root
 * 2. Write content to a .tmp file in the same directory
 * 3. If target exists, create a backup
 * 4. Copy .tmp to target (with retry on EACCES/EBUSY)
 * 5. Delete .tmp file
 * 6. On failure, attempt rollback from backup
 */
export async function safeWriteFile(
  filePath: string,
  content: string,
  options: SafeWriteOptions
): Promise<SafeWriteResult> {
  const normalized = normalizePath(filePath);
  const normalizedRoot = normalizePath(options.vaultRoot);

  // Path traversal check
  if (!isWithinRoot(normalized, normalizedRoot)) {
    return {
      success: false,
      error: `Path traversal blocked: "${filePath}" is outside vault root`,
    };
  }

  const dir = path.dirname(normalized);
  const tmpPath = normalized + ".tmp";
  const shouldBackup = options.backup !== false;
  const maxBackups = options.maxBackups ?? MAX_BACKUPS;
  let backupPath: string | undefined;

  try {
    // Ensure directory exists
    await fs.mkdir(dir, { recursive: true });

    // Step 1: Write to .tmp file
    await writeWithRetry(tmpPath, content);

    // Step 2: Backup existing file if it exists
    if (shouldBackup) {
      backupPath = await createBackup(normalized, maxBackups);
    }

    // Step 3: Copy .tmp → target (with retry for OneDrive locks)
    await copyWithRetry(tmpPath, normalized);

    // Step 4: Clean up .tmp
    await deleteQuietly(tmpPath);

    return { success: true, backupPath };
  } catch (err) {
    // Attempt rollback from backup
    if (backupPath) {
      try {
        await copyWithRetry(backupPath, normalized);
      } catch {
        // Rollback failed — backup still exists for manual recovery
      }
    }

    // Clean up .tmp file
    await deleteQuietly(tmpPath);

    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Write failed: ${message}`, backupPath };
  }
}

/**
 * Execute an async operation with retry on OneDrive lock errors.
 */
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (
        isNodeError(err) &&
        RETRYABLE_CODES.has(err.code ?? "") &&
        attempt < RETRY_DELAYS.length
      ) {
        await sleep(RETRY_DELAYS[attempt]);
        continue;
      }
      throw err;
    }
  }
  throw new Error("withRetry exhausted attempts");
}

/**
 * Write content to a file with retry on OneDrive lock errors.
 */
async function writeWithRetry(filePath: string, content: string): Promise<void> {
  await withRetry(() => fs.writeFile(filePath, content, "utf-8"));
}

/**
 * Copy a file with retry on OneDrive lock errors.
 * Uses copyFile (which does copy, not rename) — safe on Windows.
 */
async function copyWithRetry(src: string, dest: string): Promise<void> {
  await withRetry(() => fs.copyFile(src, dest));
}

/**
 * Create a numbered backup of the file if it exists.
 * Returns the backup path, or undefined if file didn't exist.
 */
async function createBackup(
  filePath: string,
  maxBackups: number
): Promise<string | undefined> {
  try {
    await fs.access(filePath);
  } catch {
    return undefined; // File doesn't exist, nothing to back up
  }

  const dir = path.dirname(filePath);
  const ext = path.extname(filePath);
  const base = path.basename(filePath, ext);

  // Rotate existing backups: .bak.5 → delete, .bak.4 → .bak.5, etc.
  for (let i = maxBackups; i >= 1; i--) {
    const older = path.join(dir, `${base}${ext}.bak.${i}`);
    if (i === maxBackups) {
      await deleteQuietly(older);
    } else {
      const newer = path.join(dir, `${base}${ext}.bak.${i + 1}`);
      try {
        await fs.rename(older, newer); // rename is fine for backup rotation
      } catch {
        // Backup doesn't exist yet, skip
      }
    }
  }

  // Copy current file to .bak.1
  const backupPath = path.join(dir, `${base}${ext}.bak.1`);
  await fs.copyFile(filePath, backupPath);
  return backupPath;
}

/**
 * Delete a file, ignoring errors if it doesn't exist.
 */
async function deleteQuietly(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch {
    // File doesn't exist or can't be deleted — not critical
  }
}
