"use client";

import { useLayoutStore } from "@/stores/layoutStore";
import { cn } from "@/lib/utils/cn";

export function Header() {
  const toggleChat = useLayoutStore((s) => s.toggleChat);
  const chatOpen = useLayoutStore((s) => s.chatOpen);

  return (
    <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-6">
      <div className="text-sm text-gray-500">
        {new Date().toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={toggleChat}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1",
            chatOpen
              ? "bg-blue-100 text-blue-700"
              : "text-gray-600 hover:bg-gray-100"
          )}
          title="Toggle chat panel (Ctrl+K)"
        >
          💬 {chatOpen ? "Close Chat" : "Open Chat"}
        </button>
      </div>
    </header>
  );
}
