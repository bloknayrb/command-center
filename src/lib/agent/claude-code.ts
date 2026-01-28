/**
 * Claude Code subprocess backend — uses `claude` CLI as the LLM engine.
 *
 * This lets the app use a Claude Max subscription instead of API keys.
 * Spawns `claude --print --output-format stream-json --verbose` and
 * parses the JSON events from stdout.
 *
 * Benefits:
 * - Uses existing Max subscription (no API costs)
 * - Has access to all configured MCP servers
 * - Maintains conversation context via session IDs
 */

import { spawn, type ChildProcess } from "node:child_process";
import { createInterface } from "node:readline";
import type { AgentStreamEvent, AgentRole } from "@/types/agent";

/** Timeout for the subprocess (2 minutes) */
const SUBPROCESS_TIMEOUT_MS = 120_000;

/**
 * Events we care about from the stream-json output.
 */
interface ClaudeStreamEvent {
  type: "system" | "assistant" | "user" | "result";
  subtype?: string;
  message?: {
    content: Array<{
      type: "text" | "tool_use" | "tool_result";
      text?: string;
      name?: string;
    }>;
  };
  result?: string;
  is_error?: boolean;
  session_id?: string;
  duration_ms?: number;
  total_cost_usd?: number;
}

interface ClaudeCodeOptions {
  /** The user's prompt */
  prompt: string;
  /** Session ID for conversation continuity */
  sessionId?: string;
  /** Whether this is a continuation of an existing session */
  resume?: boolean;
  /** Custom system prompt to append */
  systemPrompt?: string;
  /** Agent role for labeling stream events */
  agentRole?: AgentRole;
  /** Model override (defaults to whatever Claude Code is configured for) */
  model?: string;
}

/**
 * Query Claude Code via subprocess with streaming response.
 *
 * Spawns `claude --print --output-format stream-json --verbose`
 * and yields AgentStreamEvents as the response arrives.
 */
export async function* queryClaudeCode(
  options: ClaudeCodeOptions
): AsyncGenerator<AgentStreamEvent> {
  const {
    prompt,
    sessionId,
    resume = false,
    systemPrompt,
    agentRole = "general",
    model,
  } = options;

  const args: string[] = [
    "--print",
    "--output-format", "stream-json",
    "--verbose",
  ];

  // Session management
  if (resume && sessionId) {
    args.push("--resume", sessionId);
  } else if (sessionId) {
    args.push("--session-id", sessionId);
  }

  // System prompt
  if (systemPrompt) {
    args.push("--append-system-prompt", systemPrompt);
  }

  // Model
  if (model) {
    args.push("--model", model);
  }

  // Limit tools to what's relevant for the chat panel
  // (avoids Claude trying to edit files or run code from the web UI)
  args.push("--tools", "Read,Glob,Grep,WebSearch,WebFetch");

  // The prompt
  args.push(prompt);

  // Spawn the subprocess
  let proc: ChildProcess;
  try {
    proc = spawn("claude", args, {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env },
      shell: true,
    });
  } catch (err) {
    yield {
      type: "error",
      content: `Failed to start Claude Code: ${err instanceof Error ? err.message : String(err)}`,
      agent: agentRole,
    };
    return;
  }

  // Set up timeout
  const timeout = setTimeout(() => {
    proc.kill("SIGTERM");
  }, SUBPROCESS_TIMEOUT_MS);

  try {
    yield { type: "text", content: "", agent: agentRole };

    // Parse stdout line by line
    const rl = createInterface({
      input: proc.stdout!,
      crlfDelay: Infinity,
    });

    let capturedSessionId: string | undefined;
    let fullText = "";

    for await (const line of rl) {
      if (!line.trim()) continue;

      let event: ClaudeStreamEvent;
      try {
        event = JSON.parse(line);
      } catch {
        // Skip malformed lines
        continue;
      }

      switch (event.type) {
        case "system":
          // Capture session ID from init event
          if (event.subtype === "init" && event.session_id) {
            capturedSessionId = event.session_id;
          }
          // Skip other system events (hooks, etc.)
          break;

        case "assistant":
          // Extract text from the message content blocks
          if (event.message?.content) {
            for (const block of event.message.content) {
              if (block.type === "text" && block.text) {
                fullText += block.text;
                yield {
                  type: "text",
                  content: block.text,
                  agent: agentRole,
                };
              }
              if (block.type === "tool_use" && block.name) {
                yield {
                  type: "text",
                  content: `\n_[Using ${block.name}...]_\n`,
                  agent: agentRole,
                };
              }
            }
          }
          break;

        case "result":
          // Final result — if we got text from assistant events already,
          // don't duplicate. But if result has text we missed, yield it.
          if (event.result && !fullText && !event.is_error) {
            yield {
              type: "text",
              content: event.result,
              agent: agentRole,
            };
          }
          if (event.is_error) {
            yield {
              type: "error",
              content: event.result ?? "Claude Code returned an error",
              agent: agentRole,
            };
          }
          break;
      }
    }

    // Wait for process to exit
    await new Promise<void>((resolve, reject) => {
      proc.on("close", (code) => {
        if (code !== 0) {
          reject(new Error(`Claude Code exited with code ${code}`));
        } else {
          resolve();
        }
      });
      proc.on("error", reject);
    });

    yield { type: "done", agent: agentRole };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    yield {
      type: "error",
      content: `Claude Code error: ${msg}`,
      agent: agentRole,
    };
  } finally {
    clearTimeout(timeout);
    // Ensure process is cleaned up
    if (!proc.killed) {
      proc.kill("SIGTERM");
    }
  }
}

/**
 * Check if Claude Code CLI is available.
 */
export async function isClaudeCodeAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn("claude", ["--version"], {
      stdio: ["pipe", "pipe", "pipe"],
      shell: true,
    });

    proc.on("close", (code) => resolve(code === 0));
    proc.on("error", () => resolve(false));

    // Timeout after 5s
    setTimeout(() => {
      proc.kill();
      resolve(false);
    }, 5000);
  });
}
