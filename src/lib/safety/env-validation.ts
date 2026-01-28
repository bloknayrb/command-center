/**
 * env-validation.ts — Startup environment checks.
 *
 * Validates that all required environment variables are present
 * and that critical paths exist. Returns clear error messages.
 */

import * as fs from "node:fs/promises";

export interface EnvValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate all required environment variables and paths at startup.
 * Call this once when the server starts.
 */
export async function validateEnvironment(): Promise<EnvValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Optional: Anthropic API key (not needed if using Claude Code backend)
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    warnings.push(
      "ANTHROPIC_API_KEY not set — using Claude Code subprocess backend (Max subscription)"
    );
  } else if (!apiKey.startsWith("sk-ant-")) {
    errors.push(
      'ANTHROPIC_API_KEY has invalid format — should start with "sk-ant-"'
    );
  }

  // Required: Obsidian vault path
  const vaultPath = process.env.OBSIDIAN_VAULT_PATH;
  if (!vaultPath) {
    errors.push(
      "OBSIDIAN_VAULT_PATH is not set. Add it to .env.local (see .env.local.example)"
    );
  } else {
    const accessible = await isAccessible(vaultPath);
    if (!accessible) {
      errors.push(
        `OBSIDIAN_VAULT_PATH is not accessible: "${vaultPath}". ` +
          "Check that the path exists and OneDrive is syncing."
      );
    }
  }

  // Optional: SimpleMem MCP
  const simpleMemPath = process.env.SIMPLEMEM_PATH;
  if (!simpleMemPath) {
    warnings.push(
      "SIMPLEMEM_PATH not set — SimpleMem memory will be unavailable (chat still works)"
    );
  } else {
    const accessible = await isAccessible(simpleMemPath);
    if (!accessible) {
      warnings.push(
        `SIMPLEMEM_PATH not accessible: "${simpleMemPath}" — SimpleMem will be unavailable`
      );
    }
  }

  // Optional: OpenMemory MCP
  const openMemoryUrl = process.env.OPENMEMORY_URL;
  if (!openMemoryUrl) {
    warnings.push(
      "OPENMEMORY_URL not set — OpenMemory will be unavailable (chat still works)"
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Check if a file/directory path is accessible.
 */
async function isAccessible(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}
