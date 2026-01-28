/**
 * mcp-health.ts — MCP server health checks with graceful degradation.
 *
 * Polls MCP servers periodically, caches results, and provides
 * user-friendly status messages. System continues working even
 * if MCP servers are unavailable.
 */

export type McpServerStatus = "healthy" | "degraded" | "unavailable" | "unknown";

export interface McpHealthStatus {
  name: string;
  status: McpServerStatus;
  lastCheck: Date | null;
  lastError?: string;
  /** User-friendly description of current state */
  message: string;
}

export interface SystemHealth {
  overall: McpServerStatus;
  servers: McpHealthStatus[];
  timestamp: Date;
}

// In-memory cache of health statuses
const healthCache = new Map<string, McpHealthStatus>();

/**
 * Get current health status of all registered MCP servers.
 * Returns cached results — call refreshHealth() to update.
 */
export function getSystemHealth(): SystemHealth {
  const servers = Array.from(healthCache.values());

  let overall: McpServerStatus = "healthy";
  if (servers.some((s) => s.status === "unavailable")) {
    overall = servers.every((s) => s.status === "unavailable")
      ? "unavailable"
      : "degraded";
  }

  return {
    overall,
    servers,
    timestamp: new Date(),
  };
}

/**
 * Register an MCP server for health tracking.
 */
export function registerServer(name: string): void {
  healthCache.set(name, {
    name,
    status: "unknown",
    lastCheck: null,
    message: `${name}: not yet checked`,
  });
}

/**
 * Update the health status of a specific MCP server.
 * Called by the health check polling loop or after connection attempts.
 */
export function updateServerHealth(
  name: string,
  status: McpServerStatus,
  error?: string
): void {
  const messages: Record<McpServerStatus, string> = {
    healthy: `${name}: connected and responding`,
    degraded: `${name}: responding slowly or partially`,
    unavailable: `${name}: offline — features that use ${name} will be limited`,
    unknown: `${name}: not yet checked`,
  };

  healthCache.set(name, {
    name,
    status,
    lastCheck: new Date(),
    lastError: error,
    message: error ? `${messages[status]} (${error})` : messages[status],
  });
}

/**
 * Get a user-friendly summary of system health.
 * Suitable for displaying in the UI header or health endpoint.
 */
export function getHealthSummary(): string {
  const health = getSystemHealth();
  switch (health.overall) {
    case "healthy":
      return "All systems operational";
    case "degraded":
      return "Some services unavailable — core features still work";
    case "unavailable":
      return "Memory services offline — chat works but won't remember context";
    case "unknown":
      return "System starting up...";
  }
}
