"use client";

import { useSelectionStore } from "@/stores/selectionStore";
import {
  Clock, Inbox, BarChart3, Mail, CheckCircle,
  RefreshCw, Link, ClipboardList, FileText,
} from "lucide-react";

interface SmartSuggestionsProps {
  onSuggestion: (text: string) => void;
}

const baseSuggestions: { label: string; icon: React.ReactNode }[] = [
  { label: "What are my overdue tasks?", icon: <Clock className="h-3 w-3" /> },
  { label: "Triage my new items", icon: <Inbox className="h-3 w-3" /> },
  { label: "Generate weekly report", icon: <BarChart3 className="h-3 w-3" /> },
];

/**
 * Smart suggestions based on selected items.
 * Shows context-aware action buttons.
 */
export function SmartSuggestions({ onSuggestion }: SmartSuggestionsProps) {
  const items = useSelectionStore((s) => s.items);

  // Context-aware suggestions based on selected items
  const contextSuggestions: { label: string; icon: React.ReactNode }[] = [];

  for (const item of items) {
    switch (item.type) {
      case "email":
        contextSuggestions.push(
          { label: `Draft reply to "${item.title}"`, icon: <Mail className="h-3 w-3" /> },
          { label: `Create task from "${item.title}"`, icon: <CheckCircle className="h-3 w-3" /> }
        );
        break;
      case "task":
        contextSuggestions.push(
          { label: `Update status of "${item.title}"`, icon: <RefreshCw className="h-3 w-3" /> },
          { label: `What depends on "${item.title}"?`, icon: <Link className="h-3 w-3" /> }
        );
        break;
      case "meeting":
        contextSuggestions.push(
          { label: `Prep for "${item.title}"`, icon: <ClipboardList className="h-3 w-3" /> },
          { label: `Generate agenda for "${item.title}"`, icon: <FileText className="h-3 w-3" /> }
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
