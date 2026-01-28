/**
 * useAgent hook — SSE streaming for agent chat interactions.
 *
 * Connects to /api/agent via Server-Sent Events and provides
 * streaming responses with proper state management.
 */

"use client";

import { useState, useCallback, useRef } from "react";
import type { AgentStreamEvent, AgentMessage, AgentRole } from "@/types/agent";

interface UseAgentReturn {
  /** Send a message to the agent */
  sendMessage: (prompt: string, agent?: AgentRole) => Promise<void>;
  /** Chat message history */
  messages: AgentMessage[];
  /** Whether the agent is currently streaming a response */
  isStreaming: boolean;
  /** Current partial response being streamed */
  streamingContent: string;
  /** Last error message */
  error: string | null;
  /** Clear chat history */
  clearMessages: () => void;
}

export function useAgent(): UseAgentReturn {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const sessionIdRef = useRef<string>(crypto.randomUUID());

  const sendMessage = useCallback(
    async (prompt: string, agent?: AgentRole) => {
      setError(null);
      setStreamingContent("");

      // Add user message immediately
      const userMsg: AgentMessage = {
        role: "user",
        content: prompt,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsStreaming(true);

      try {
        const response = await fetch("/api/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            sessionId: sessionIdRef.current,
            agent,
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response stream");

        const decoder = new TextDecoder();
        let fullContent = "";
        let currentAgent: AgentRole | undefined;
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;

            try {
              const event: AgentStreamEvent = JSON.parse(data);

              switch (event.type) {
                case "text":
                  if (event.content) {
                    fullContent += event.content;
                    setStreamingContent(fullContent);
                  }
                  if (event.agent) currentAgent = event.agent;
                  break;
                case "error":
                  setError(event.content ?? "Unknown error");
                  break;
                case "done":
                  // Add complete assistant message
                  const assistantMsg: AgentMessage = {
                    role: "assistant",
                    content: fullContent,
                    agent: currentAgent,
                    timestamp: new Date().toISOString(),
                  };
                  setMessages((prev) => [...prev, assistantMsg]);
                  break;
              }
            } catch {
              // Skip malformed SSE data
            }
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to send message";
        setError(msg);
      } finally {
        setIsStreaming(false);
        setStreamingContent("");
      }
    },
    []
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
    sessionIdRef.current = crypto.randomUUID();
  }, []);

  return {
    sendMessage,
    messages,
    isStreaming,
    streamingContent,
    error,
    clearMessages,
  };
}
