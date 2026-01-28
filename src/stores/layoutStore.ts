/**
 * Layout state store — panel sizes, collapsed states, persistence.
 */

import { create } from "zustand";

interface LayoutState {
  /** Chat panel visibility */
  chatOpen: boolean;
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
  toggleSidebar: () => void;
  toggleCalendar: () => void;
  togglePip: () => void;
}

export const useLayoutStore = create<LayoutState>((set) => ({
  chatOpen: false,
  sidebarCollapsed: false,
  calendarCollapsed: false,
  pipCollapsed: false,

  toggleChat: () => set((s) => ({ chatOpen: !s.chatOpen })),
  openChat: () => set({ chatOpen: true }),
  closeChat: () => set({ chatOpen: false }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  toggleCalendar: () => set((s) => ({ calendarCollapsed: !s.calendarCollapsed })),
  togglePip: () => set((s) => ({ pipCollapsed: !s.pipCollapsed })),
}));
