/**
 * PIP Evidence API route.
 *
 * GET /api/pip?start=2026-01-20&end=2026-01-24  — weekly report
 * GET /api/pip?type=checkin&start=...&end=...     — full check-in evidence
 */

import { NextRequest, NextResponse } from "next/server";
import { generateWeeklyReport, generateCheckinEvidence } from "@/lib/pip/evidence";
import { toUserError } from "@/lib/safety/user-errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const type = searchParams.get("type") ?? "weekly";
    const start = searchParams.get("start") ?? undefined;
    const end = searchParams.get("end") ?? undefined;

    if (type === "checkin") {
      if (!start || !end) {
        return NextResponse.json(
          { error: "start and end dates required for check-in evidence" },
          { status: 400 }
        );
      }
      const markdown = await generateCheckinEvidence(start, end);
      return NextResponse.json({ markdown, type: "checkin" });
    }

    // Default: weekly report
    const report = await generateWeeklyReport(start, end);
    return NextResponse.json({
      ...report,
      type: "weekly",
    });
  } catch (err) {
    const userErr = toUserError(err);
    return NextResponse.json(
      { error: userErr.message, recovery: userErr.recovery },
      { status: 500 }
    );
  }
}
