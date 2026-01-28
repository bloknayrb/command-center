/**
 * Hot-path vault scanner — scans only active directories with recency filter.
 *
 * Problem: 25,500+ files in vault. Full scan = crash or multi-second latency.
 * Solution: Scan ~400-600 files from whitelisted directories + recency filter.
 *
 * Strategy:
 * 1. Always scan: TaskNotes, 01-Projects, Calendar (small, always relevant)
 * 2. Recency scan: Emails, TeamsChats, Daily Notes (last 14 days by mtime)
 * 3. System files: Specific files from 99-System
 * 4. Cache results for 60 seconds
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { config } from "@/config/app.config";
import { normalizePath } from "@/lib/utils/paths";

/** Category matchers for vault file classification. */
export const VAULT_CATEGORIES = {
  emails: (relativePath: string) => relativePath.startsWith("Emails/"),
  teams: (relativePath: string) => relativePath.startsWith("TeamsChats/"),
  meetings: (relativePath: string) =>
    relativePath.startsWith("Calendar/") || relativePath.includes("Meeting Note"),
  tasks: (relativePath: string) => relativePath.startsWith("TaskNotes/"),
} as const;

export interface VaultFile {
  /** Absolute path */
  path: string;
  /** File name without extension */
  name: string;
  /** Relative path from vault root */
  relativePath: string;
  /** File modified time */
  mtime: Date;
  /** File size in bytes */
  size: number;
  /** Which scan group this came from */
  source: "always" | "recency" | "system";
}

export interface ScanResult {
  files: VaultFile[];
  scannedCount: number;
  totalDirs: number;
  scanDuration: number; // ms
  cachedAt: Date | null;
}

// Cache
let cachedResult: ScanResult | null = null;
let cacheTime = 0;

/**
 * Scan the vault hot paths. Returns cached result if within TTL.
 */
export async function scanVault(vaultRoot: string): Promise<ScanResult> {
  const now = Date.now();
  if (cachedResult && now - cacheTime < config.scanner_cache_ttl * 1000) {
    return { ...cachedResult, cachedAt: new Date(cacheTime) };
  }

  const start = Date.now();
  const root = normalizePath(vaultRoot);
  const files: VaultFile[] = [];

  // 1. Always-scan directories
  for (const dir of config.hot_paths.always_scan) {
    const dirPath = `${root}/${dir}`;
    const dirFiles = await scanDirectory(dirPath, root, "always");
    files.push(...dirFiles);
  }

  // 2. Recency-scan directories (filter by mtime)
  for (const { path: dir, max_age_days } of config.hot_paths.recency_scan) {
    const dirPath = `${root}/${dir}`;
    const cutoff = new Date(now - max_age_days * 24 * 60 * 60 * 1000);
    const dirFiles = await scanDirectory(dirPath, root, "recency", cutoff);
    files.push(...dirFiles);
  }

  // 3. System files (specific files)
  for (const relPath of config.hot_paths.system_files) {
    const filePath = `${root}/${relPath}`;
    const file = await scanSingleFile(filePath, root, "system");
    if (file) files.push(file);
  }

  const duration = Date.now() - start;
  const result: ScanResult = {
    files,
    scannedCount: files.length,
    totalDirs:
      config.hot_paths.always_scan.length +
      config.hot_paths.recency_scan.length,
    scanDuration: duration,
    cachedAt: null,
  };

  // Cache result
  cachedResult = result;
  cacheTime = now;

  return result;
}

/**
 * Invalidate the scanner cache. Call after vault writes.
 */
export function invalidateCache(): void {
  cachedResult = null;
  cacheTime = 0;
}

/**
 * Scan a directory for .md files, optionally filtering by recency.
 */
async function scanDirectory(
  dirPath: string,
  vaultRoot: string,
  source: VaultFile["source"],
  cutoffDate?: Date
): Promise<VaultFile[]> {
  const files: VaultFile[] = [];

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".md")) continue;

      const fullPath = normalizePath(path.join(dirPath, entry.name));

      try {
        const stat = await fs.stat(fullPath);

        // Recency filter
        if (cutoffDate && stat.mtime < cutoffDate) continue;

        files.push({
          path: fullPath,
          name: path.basename(entry.name, ".md"),
          relativePath: fullPath.slice(vaultRoot.length + 1),
          mtime: stat.mtime,
          size: stat.size,
          source,
        });
      } catch {
        // File stat failed (possibly OneDrive hydration issue) — skip
        continue;
      }
    }
  } catch {
    // Directory doesn't exist or isn't accessible — not fatal
  }

  return files;
}

/**
 * Scan a single file by path.
 */
async function scanSingleFile(
  filePath: string,
  vaultRoot: string,
  source: VaultFile["source"]
): Promise<VaultFile | null> {
  try {
    const normalized = normalizePath(filePath);
    const stat = await fs.stat(normalized);
    return {
      path: normalized,
      name: path.basename(normalized, ".md"),
      relativePath: normalized.slice(vaultRoot.length + 1),
      mtime: stat.mtime,
      size: stat.size,
      source,
    };
  } catch {
    return null; // File doesn't exist
  }
}
