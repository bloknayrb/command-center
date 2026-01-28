"use client";

import type { AgentMessage } from "@/types/agent";
import { SafeMarkdown } from "./SafeMarkdown";
import { cn } from "@/lib/utils/cn";

interface MessageBubbleProps {
  message: AgentMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-lg px-4 py-2.5",
          isUser ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900"
        )}
      >
        {!isUser && message.agent && (
          <div className="mb-1 text-xs font-medium text-gray-500">
            {message.agent} agent
          </div>
        )}
        {isUser ? (
          <p className="text-sm">{message.content}</p>
        ) : (
          <SafeMarkdown
            content={message.content}
            className="prose prose-sm max-w-none"
          />
        )}
      </div>
    </div>
  );
}
