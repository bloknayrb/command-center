/**
 * Anthropic API backend — uses @anthropic-ai/sdk directly.
 *
 * Requires ANTHROPIC_API_KEY in environment.
 * Supports streaming + tool execution loops.
 */

import Anthropic from "@anthropic-ai/sdk";
import { createClient, MODEL_SONNET, MAX_TOKENS } from "./config";
import { addMessage, getConversationHistory } from "./sessions";
import { onQueryStart, onQueryComplete, onQueryError } from "./hooks";
import { VAULT_TOOLS, executeTool } from "./tools";
import type { AgentQueryOptions, AgentStreamEvent, AgentMessage, AgentRole } from "@/types/agent";
import type { SubagentConfig } from "./subagents";
import { formatDateTimeET } from "@/lib/utils/dates";

const MAX_TOOL_LOOPS = 5;

interface AnthropicApiOptions extends AgentQueryOptions {
  agentConfig: SubagentConfig;
}

interface ToolCollectionResult {
  toolResults: Anthropic.Messages.ToolResultBlockParam[];
  events: AgentStreamEvent[];
}

/**
 * Execute tool calls and collect results for the Anthropic API tool loop.
 */
async function collectToolResults(
  toolBlocks: Anthropic.Messages.ToolUseBlock[],
  agentRole: AgentRole
): Promise<ToolCollectionResult> {
  const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];
  const events: AgentStreamEvent[] = [];
  for (const tool of toolBlocks) {
    events.push({
      type: "text",
      content: `\n_[Using ${tool.name}...]_\n`,
      agent: agentRole,
    });
    const result = await executeTool(
      tool.name,
      tool.input as Record<string, unknown>
    );
    toolResults.push({
      type: "tool_result",
      tool_use_id: tool.id,
      content: result,
    });
  }
  return { toolResults, events };
}

/**
 * Query using the Anthropic API with streaming + tool execution.
 */
export async function* queryAnthropicApi(
  options: AnthropicApiOptions
): AsyncGenerator<AgentStreamEvent> {
  const sessionId = options.sessionId ?? crypto.randomUUID();
  const { agentConfig } = options;

  const hookCtx = {
    sessionId,
    agent: agentConfig.name,
    prompt: options.prompt,
  };

  onQueryStart(hookCtx);
  const startTime = Date.now();

  try {
    const client = createClient();

    // Add user message to session
    const userMsg: AgentMessage = {
      role: "user",
      content: options.prompt,
      timestamp: formatDateTimeET(),
    };
    addMessage(sessionId, userMsg);

    const messages: Anthropic.Messages.MessageParam[] = [
      ...getConversationHistory(sessionId),
    ];

    yield { type: "text", content: "", agent: agentConfig.role };

    let fullResponse = "";
    let totalInput = 0;
    let totalOutput = 0;

    // Tool loop
    for (let loop = 0; loop <= MAX_TOOL_LOOPS; loop++) {
      const isLastLoop = loop === MAX_TOOL_LOOPS;

      if (isLastLoop || loop > 0) {
        // Non-streaming for tool loops
        const response = await client.messages.create({
          model: MODEL_SONNET,
          max_tokens: MAX_TOKENS,
          system: agentConfig.systemPrompt,
          tools: isLastLoop ? undefined : VAULT_TOOLS,
          messages,
        });

        totalInput += response.usage.input_tokens;
        totalOutput += response.usage.output_tokens;

        const toolBlocks = response.content.filter(
          (b): b is Anthropic.Messages.ToolUseBlock => b.type === "tool_use"
        );
        const textBlocks = response.content.filter(
          (b): b is Anthropic.Messages.TextBlock => b.type === "text"
        );

        for (const block of textBlocks) {
          fullResponse += block.text;
          yield { type: "text", content: block.text, agent: agentConfig.role };
        }

        if (toolBlocks.length === 0 || response.stop_reason === "end_turn") break;

        const { toolResults, events: toolEvents } = await collectToolResults(toolBlocks, agentConfig.role);
        for (const event of toolEvents) yield event;

        messages.push({ role: "assistant", content: response.content });
        messages.push({ role: "user", content: toolResults });
      } else {
        // First call — streaming
        const stream = client.messages.stream({
          model: MODEL_SONNET,
          max_tokens: MAX_TOKENS,
          system: agentConfig.systemPrompt,
          tools: VAULT_TOOLS,
          messages,
        });

        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            fullResponse += event.delta.text;
            yield {
              type: "text",
              content: event.delta.text,
              agent: agentConfig.role,
            };
          }
        }

        const finalMessage = await stream.finalMessage();
        totalInput += finalMessage.usage.input_tokens;
        totalOutput += finalMessage.usage.output_tokens;

        const toolBlocks = finalMessage.content.filter(
          (b): b is Anthropic.Messages.ToolUseBlock => b.type === "tool_use"
        );

        if (toolBlocks.length === 0 || finalMessage.stop_reason === "end_turn") break;

        const { toolResults, events: toolEvents } = await collectToolResults(toolBlocks, agentConfig.role);
        for (const event of toolEvents) yield event;

        messages.push({ role: "assistant", content: finalMessage.content });
        messages.push({ role: "user", content: toolResults });
      }
    }

    const assistantMsg: AgentMessage = {
      role: "assistant",
      content: fullResponse,
      agent: agentConfig.role,
      timestamp: formatDateTimeET(),
    };
    addMessage(sessionId, assistantMsg);

    onQueryComplete(hookCtx, Date.now() - startTime, {
      input: totalInput,
      output: totalOutput,
    });

    yield { type: "done", agent: agentConfig.role };
  } catch (err) {
    onQueryError(hookCtx, err);
    const message = err instanceof Error ? err.message : String(err);
    yield { type: "error", content: message, agent: agentConfig.role };
  }
}
