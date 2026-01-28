/**
 * Selection state store — selected items for chat context.
 *
 * When items are selected on the dashboard, they become context
 * chips in the chat panel. This store manages that state.
 */

import { create } from "zustand";

export interface SelectedItem {
  id: string;
  type: "task" | "email" | "teams" | "meeting";
  title: string;
  /** Brief preview text */
  preview: string;
}

interface SelectionState {
  /** Currently selected items */
  items: SelectedItem[];
  /** Add an item to selection */
  select: (item: SelectedItem) => void;
  /** Remove an item from selection */
  deselect: (id: string) => void;
  /** Clear all selections */
  clearSelection: () => void;
}

export const useSelectionStore = create<SelectionState>((set) => ({
  items: [],
  select: (item) =>
    set((s) => ({
      items: s.items.some((i) => i.id === item.id)
        ? s.items
        : [...s.items, item],
    })),
  deselect: (id) =>
    set((s) => ({
      items: s.items.filter((i) => i.id !== id),
    })),
  clearSelection: () => set({ items: [] }),
}));
