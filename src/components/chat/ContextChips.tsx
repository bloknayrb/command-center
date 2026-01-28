"use client";

import { useSelectionStore, type SelectedItem } from "@/stores/selectionStore";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function ContextChips() {
  const items = useSelectionStore((s) => s.items);
  const deselect = useSelectionStore((s) => s.deselect);
  const clearSelection = useSelectionStore((s) => s.clearSelection);

  if (items.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 border-b border-gray-200 bg-gray-50 px-3 py-2">
      <span className="text-xs text-gray-500">Context:</span>
      {items.map((item) => (
        <Chip key={item.id} item={item} onRemove={() => deselect(item.id)} />
      ))}
      {items.length > 1 && (
        <button
          onClick={clearSelection}
          className="text-xs text-gray-400 hover:text-gray-600 rounded focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          Clear all
        </button>
      )}
    </div>
  );
}

const typeColors: Record<string, string> = {
  task: "bg-green-100 text-green-800",
  email: "bg-blue-100 text-blue-800",
  teams: "bg-purple-100 text-purple-800",
  meeting: "bg-orange-100 text-orange-800",
};

function Chip({
  item,
  onRemove,
}: {
  item: SelectedItem;
  onRemove: () => void;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        typeColors[item.type] ?? "bg-gray-100 text-gray-800"
      )}
    >
      {item.title}
      <button
        onClick={onRemove}
        className="hover:text-gray-900 rounded-full focus-visible:ring-2 focus-visible:ring-blue-500"
        aria-label={`Remove ${item.title}`}
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}
