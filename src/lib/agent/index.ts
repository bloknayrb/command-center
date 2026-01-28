/**
 * Agent core — queryAgent() with dual backend support.
 *
 * Routes to either:
 * - Claude Code subprocess (Max subscription, default)
 * - Anthropic API (if ANTHROPIC_API_KEY is set)
 *
 * Both backends produce the same AgentStreamEvent stream.
 */

import { getBackend } from "./config";
import { queryClaudeCode } from "./claude-code";
import { queryAnthropicApi } from "./anthropic-api";
import { routeToSubagent } from "./subagents";
import type { AgentQueryOptions, AgentStreamEvent } from "@/types/agent";

/**
 * Query the agent with streaming response.
 * Automatically selects the correct backend based on configuration.
 *
 * Usage:
 * ```ts
 * for await (const event of queryAgent({ prompt: "What are my tasks?" })) {
 *   if (event.type === "text") process.stdout.write(event.content);
 * }
 * ```
 */
export async function* queryAgent(
  options: AgentQueryOptions
): AsyncGenerator<AgentStreamEvent> {
  const backend = getBackend();
  const agentConfig = options.agent
    ? { role: options.agent, name: options.agent, systemPrompt: "", triggers: [] }
    : routeToSubagent(options.prompt);

  if (backend === "claude-code") {
    // Use Claude Code subprocess (Max subscription)
    yield* queryClaudeCode({
      prompt: options.prompt,
      sessionId: options.sessionId,
      resume: !!options.sessionId,
      systemPrompt: agentConfig.systemPrompt || undefined,
      agentRole: agentConfig.role,
    });
  } else {
    // Use Anthropic API directly
    yield* queryAnthropicApi({
      ...options,
      agentConfig,
    });
  }
}
