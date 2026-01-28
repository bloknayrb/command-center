/**
 * Vault read/write operations — wraps safe-write for Obsidian vault access.
 *
 * All vault file access goes through these functions to ensure:
 * - Path validation (stays within vault root)
 * - Safe writes with backup and OneDrive retry
 * - Consistent path normalization
 */

import * as fs from "node:fs/promises";
import { safeWriteFile } from "@/lib/safety/safe-write";
import { normalizePath, isWithinRoot, checkPathLength } from "@/lib/utils/paths";

/**
 * Get the vault root path from environment.
 */
export function getVaultRoot(): string {
  const vaultPath = process.env.OBSIDIAN_VAULT_PATH;
  if (!vaultPath) {
    throw new Error("OBSIDIAN_VAULT_PATH not set in environment");
  }
  return normalizePath(vaultPath);
}

/**
 * Read a file from the vault. Returns content as string.
 * Throws if file doesn't exist or path is outside vault.
 */
export async function readVaultFile(filePath: string): Promise<string> {
  const normalized = normalizePath(filePath);
  const root = getVaultRoot();

  if (!isWithinRoot(normalized, root)) {
    throw new Error(`Path outside vault: ${filePath}`);
  }

  const pathWarning = checkPathLength(normalized);
  if (pathWarning) {
    console.warn(`[vault] ${pathWarning}`);
  }

  return fs.readFile(normalized, "utf-8");
}

/**
 * Write a file to the vault using safe-write (atomic, backup, retry).
 */
export async function writeVaultFile(
  filePath: string,
  content: string
): Promise<{ success: boolean; error?: string }> {
  const root = getVaultRoot();
  const result = await safeWriteFile(filePath, content, {
    vaultRoot: root,
  });
  return { success: result.success, error: result.error };
}

/**
 * Get the vault root path, returning null if not configured.
 */
export function getVaultRootOrNull(): string | null {
  const vaultPath = process.env.OBSIDIAN_VAULT_PATH;
  if (!vaultPath) return null;
  return normalizePath(vaultPath);
}

/**
 * Check if a vault file exists.
 * Throws if path is outside vault root (path traversal prevention).
 */
export async function vaultFileExists(filePath: string): Promise<boolean> {
  const normalized = normalizePath(filePath);
  const root = getVaultRoot();

  if (!isWithinRoot(normalized, root)) {
    throw new Error(`Path outside vault: ${filePath}`);
  }

  try {
    await fs.access(normalized);
    return true;
  } catch {
    return false;
  }
}

/**
 * List files in a vault directory (non-recursive).
 */
export async function listVaultDir(
  dirPath: string
): Promise<string[]> {
  const normalized = normalizePath(dirPath);
  const root = getVaultRoot();

  if (!isWithinRoot(normalized, root)) {
    throw new Error(`Path outside vault: ${dirPath}`);
  }

  try {
    const entries = await fs.readdir(normalized, { withFileTypes: true });
    return entries
      .filter((e) => e.isFile() && e.name.endsWith(".md"))
      .map((e) => `${normalized}/${e.name}`);
  } catch {
    return []; // Directory doesn't exist or isn't accessible
  }
}
