/**
 * Vault scan API route — returns recent files from hot paths.
 *
 * GET /api/scan?since=2026-01-27T00:00:00
 */

import { NextRequest, NextResponse } from "next/server";
import { scanVault, type VaultFile } from "@/lib/obsidian/scanner";
import { toUserError } from "@/lib/safety/user-errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getVaultRoot(): string {
  return process.env.OBSIDIAN_VAULT_PATH ?? "";
}

export async function GET(request: NextRequest) {
  try {
    const vaultRoot = getVaultRoot();
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
    const emails = files.filter((f) => f.relativePath.startsWith("Emails/"));
    const teams = files.filter((f) => f.relativePath.startsWith("TeamsChats/"));
    const meetings = files.filter(
      (f) =>
        f.relativePath.startsWith("Calendar/") ||
        f.relativePath.includes("Meeting Note")
    );
    const tasks = files.filter((f) => f.relativePath.startsWith("TaskNotes/"));
    const other = files.filter(
      (f) =>
        !emails.includes(f) &&
        !teams.includes(f) &&
        !meetings.includes(f) &&
        !tasks.includes(f)
    );

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
