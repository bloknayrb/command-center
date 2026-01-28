/**
 * Agent configuration — backend selection, model settings.
 *
 * Backend selection:
 * - If ANTHROPIC_API_KEY is set → use Anthropic SDK (direct API)
 * - Otherwise → use Claude Code subprocess (Max subscription)
 */

import Anthropic from "@anthropic-ai/sdk";

export type AgentBackend = "claude-code" | "anthropic-api";

/** Default model for complex queries */
export const MODEL_SONNET = "claude-sonnet-4-20250514";

/** Fast model for simple routing and classification */
export const MODEL_HAIKU = "claude-haiku-4-20250414";

/** Max tokens for agent responses */
export const MAX_TOKENS = 4096;

/**
 * Detect which backend to use based on environment.
 */
export function getBackend(): AgentBackend {
  if (process.env.ANTHROPIC_API_KEY) {
    return "anthropic-api";
  }
  return "claude-code";
}

/**
 * Create a configured Anthropic client.
 * Only works when ANTHROPIC_API_KEY is set.
 */
export function createClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY not set. Either add it to .env.local or use Claude Code backend (default)."
    );
  }
  return new Anthropic({ apiKey });
}
