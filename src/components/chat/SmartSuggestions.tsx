"use client";

import { useSelectionStore } from "@/stores/selectionStore";

interface SmartSuggestionsProps {
  onSuggestion: (text: string) => void;
}

/**
 * Smart suggestions based on selected items.
 * Shows context-aware action buttons.
 */
export function SmartSuggestions({ onSuggestion }: SmartSuggestionsProps) {
  const items = useSelectionStore((s) => s.items);

  // Base suggestions (always available)
  const baseSuggestions = [
    { label: "What are my overdue tasks?", icon: "⏰" },
    { label: "Triage my new items", icon: "📥" },
    { label: "Generate weekly report", icon: "📊" },
  ];

  // Context-aware suggestions based on selected items
  const contextSuggestions: { label: string; icon: string }[] = [];

  for (const item of items) {
    switch (item.type) {
      case "email":
        contextSuggestions.push(
          { label: `Draft reply to "${item.title}"`, icon: "✉️" },
          { label: `Create task from "${item.title}"`, icon: "✅" }
        );
        break;
      case "task":
        contextSuggestions.push(
          { label: `Update status of "${item.title}"`, icon: "🔄" },
          { label: `What depends on "${item.title}"?`, icon: "🔗" }
        );
        break;
      case "meeting":
        contextSuggestions.push(
          { label: `Prep for "${item.title}"`, icon: "📋" },
          { label: `Generate agenda for "${item.title}"`, icon: "📝" }
        );
        break;
    }
  }

  const suggestions = contextSuggestions.length > 0 ? contextSuggestions : baseSuggestions;

  return (
    <div className="flex flex-wrap gap-1.5 px-3 py-2">
      {suggestions.slice(0, 3).map((s) => (
        <button
          key={s.label}
          onClick={() => onSuggestion(s.label)}
          className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600 hover:bg-gray-50 hover:text-gray-900 focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <span>{s.icon}</span>
          <span>{s.label}</span>
        </button>
      ))}
    </div>
  );
}
