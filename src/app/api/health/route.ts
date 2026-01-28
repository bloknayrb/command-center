/**
 * System health API route.
 *
 * GET /api/health
 *
 * Returns system health status including MCP server status,
 * session count, and environment validation results.
 */

import { getSystemHealth, getHealthSummary } from "@/lib/safety/mcp-health";
import { validateEnvironment } from "@/lib/safety/env-validation";
import { getSessionCount } from "@/lib/agent/sessions";
import { getBackend } from "@/lib/agent/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const envResult = await validateEnvironment();
  const health = getSystemHealth();
  const summary = getHealthSummary();

  const status = envResult.valid ? 200 : 503;

  return new Response(
    JSON.stringify({
      status: envResult.valid ? "ok" : "degraded",
      summary,
      agent: {
        backend: getBackend(),
      },
      environment: {
        valid: envResult.valid,
        errors: envResult.errors,
        warnings: envResult.warnings,
      },
      mcp: {
        overall: health.overall,
        servers: health.servers,
      },
      sessions: {
        active: getSessionCount(),
      },
      timestamp: new Date().toISOString(),
    }),
    {
      status,
      headers: { "Content-Type": "application/json" },
    }
  );
}
