"use client";

import { useRef, useEffect } from "react";
import { useAgent } from "@/hooks/useAgent";
import { useLayoutStore } from "@/stores/layoutStore";
import { X } from "lucide-react";
import { MessageBubble } from "./MessageBubble";
import { MessageInput } from "./MessageInput";
import { ContextChips } from "./ContextChips";
import { SmartSuggestions } from "./SmartSuggestions";
import { SafeMarkdown } from "./SafeMarkdown";

export function ChatPanel() {
  const chatOpen = useLayoutStore((s) => s.chatOpen);
  const closeChat = useLayoutStore((s) => s.closeChat);
  const { messages, sendMessage, isStreaming, streamingContent, error, clearMessages } =
    useAgent();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  // Keyboard shortcuts: Ctrl+K to toggle chat, Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        useLayoutStore.getState().toggleChat();
      }
      if (e.key === "Escape") {
        useLayoutStore.getState().closeChat();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  if (!chatOpen) return null;

  return (
    <div className="flex h-full w-full flex-col border-l border-gray-200 bg-white">
      {/* Panel header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900">Chat</h3>
        <div className="flex gap-2">
          <button
            onClick={clearMessages}
            className="text-xs text-gray-400 hover:text-gray-600 focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
            title="Clear chat"
          >
            Clear
          </button>
          <button
            onClick={closeChat}
            className="text-gray-400 hover:text-gray-600 focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
            aria-label="Close chat panel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Context chips */}
      <ContextChips />

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {messages.length === 0 && !isStreaming && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-sm text-gray-400">
              Ask me anything about your tasks, projects, or vault.
            </p>
          </div>
        )}

        <div className="space-y-3">
          {messages.map((msg, i) => (
            <MessageBubble key={`${msg.timestamp}-${i}`} message={msg} />
          ))}

          {/* Streaming indicator */}
          {isStreaming && streamingContent && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-lg bg-gray-100 px-4 py-2.5 text-gray-900">
                <SafeMarkdown
                  content={streamingContent}
                  className="prose prose-sm max-w-none"
                />
                <span className="inline-block h-4 w-1 animate-pulse bg-gray-400" />
              </div>
            </div>
          )}

          {isStreaming && !streamingContent && (
            <div className="flex justify-start">
              <div className="rounded-lg bg-gray-100 px-4 py-2.5 text-sm text-gray-400">
                Thinking...
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Smart suggestions */}
      {!isStreaming && <SmartSuggestions onSuggestion={sendMessage} />}

      {/* Input */}
      <MessageInput
        onSend={sendMessage}
        disabled={isStreaming}
        placeholder={isStreaming ? "Waiting for response..." : "Ask anything... (Enter to send)"}
      />
    </div>
  );
}
