"use client";

import { create } from "zustand";

type UiState = {
  sidebarOpen: boolean;
  commandOpen: boolean;
  livePaused: boolean;
  setSidebarOpen: (open: boolean) => void;
  setCommandOpen: (open: boolean) => void;
  toggleLive: () => void;
};

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: false,
  commandOpen: false,
  livePaused: false,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setCommandOpen: (commandOpen) => set({ commandOpen }),
  toggleLive: () => set((state) => ({ livePaused: !state.livePaused })),
}));
