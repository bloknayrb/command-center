/**
 * Vault scan API route — returns recent files from hot paths.
 *
 * GET /api/scan?since=2026-01-27T00:00:00
 */

import { NextRequest, NextResponse } from "next/server";
import { scanVault, VAULT_CATEGORIES, type VaultFile } from "@/lib/obsidian/scanner";
import { getVaultRootOrNull } from "@/lib/obsidian/vault";
import { toUserError } from "@/lib/safety/user-errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const vaultRoot = getVaultRootOrNull();
    if (!vaultRoot) {
      return NextResponse.json(
        { error: "OBSIDIAN_VAULT_PATH not configured" },
        { status: 500 }
      );
    }

    const since = request.nextUrl.searchParams.get("since");
    const sinceDate = since ? new Date(since) : undefined;

    const result = await scanVault(vaultRoot);

    // Optionally filter to files newer than `since`
    let files: VaultFile[] = result.files;
    if (sinceDate && !isNaN(sinceDate.getTime())) {
      files = files.filter((f) => f.mtime >= sinceDate);
    }

    // Categorize files
    const emails = files.filter((f) => VAULT_CATEGORIES.emails(f.relativePath));
    const teams = files.filter((f) => VAULT_CATEGORIES.teams(f.relativePath));
    const meetings = files.filter((f) => VAULT_CATEGORIES.meetings(f.relativePath));
    const tasks = files.filter((f) => VAULT_CATEGORIES.tasks(f.relativePath));
    const categorized = new Set([...emails, ...teams, ...meetings, ...tasks]);
    const other = files.filter((f) => !categorized.has(f));

    return NextResponse.json({
      total: files.length,
      scanDuration: result.scanDuration,
      categories: {
        emails: emails.length,
        teams: teams.length,
        meetings: meetings.length,
        tasks: tasks.length,
        other: other.length,
      },
      files: files.slice(0, 100).map((f) => ({
        path: f.relativePath,
        name: f.name,
        mtime: f.mtime.toISOString(),
      })),
    });
  } catch (err) {
    const userErr = toUserError(err);
    return NextResponse.json(
      { error: userErr.message, recovery: userErr.recovery },
      { status: 500 }
    );
  }
}
