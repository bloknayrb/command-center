/**
 * Layout state store — panel sizes, collapsed states, persistence.
 */

import { create } from "zustand";

interface LayoutState {
  /** Chat panel visibility */
  chatOpen: boolean;
  /** Chat panel width percentage (of viewport) */
  chatWidth: number;
  /** Sidebar collapsed */
  sidebarCollapsed: boolean;
  /** Calendar section collapsed */
  calendarCollapsed: boolean;
  /** PIP panel collapsed (only used when NEXT_PUBLIC_ENABLE_PIP=true) */
  pipCollapsed: boolean;

  // Actions
  toggleChat: () => void;
  openChat: () => void;
  closeChat: () => void;
  setChatWidth: (width: number) => void;
  toggleSidebar: () => void;
  toggleCalendar: () => void;
  togglePip: () => void;
}

export const useLayoutStore = create<LayoutState>((set) => ({
  chatOpen: false,
  chatWidth: 35, // 35% of viewport
  sidebarCollapsed: false,
  calendarCollapsed: false,
  pipCollapsed: false,

  toggleChat: () => set((s) => ({ chatOpen: !s.chatOpen })),
  openChat: () => set({ chatOpen: true }),
  closeChat: () => set({ chatOpen: false }),
  setChatWidth: (width: number) => set({ chatWidth: width }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  toggleCalendar: () => set((s) => ({ calendarCollapsed: !s.calendarCollapsed })),
  togglePip: () => set((s) => ({ pipCollapsed: !s.pipCollapsed })),
}));
