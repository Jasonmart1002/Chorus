import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AgentPrefs {
  pinned: boolean;
  archived: boolean;
  displayName: string | null;
}

export type StatusFilter = "all" | "active" | "attention";

interface SidebarStore {
  agentPrefs: Record<string, AgentPrefs>;
  searchQuery: string;
  statusFilter: StatusFilter;
  showArchived: boolean;
  manualOrder: string[];
  searchOpen: boolean;

  togglePin: (agentId: string) => void;
  toggleArchive: (agentId: string) => void;
  setDisplayName: (agentId: string, name: string | null) => void;
  setSearchQuery: (query: string) => void;
  setStatusFilter: (filter: StatusFilter) => void;
  setShowArchived: (show: boolean) => void;
  setSearchOpen: (open: boolean) => void;
  removeAgentPrefs: (agentId: string) => void;
  getPrefs: (agentId: string) => AgentPrefs;
  setManualOrder: (order: string[]) => void;
  moveAgent: (fromId: string, toId: string) => void;
}

const DEFAULT_PREFS: AgentPrefs = { pinned: false, archived: false, displayName: null };

export const useSidebarStore = create<SidebarStore>()(
  persist(
    (set, get) => ({
      agentPrefs: {},
      searchQuery: "",
      statusFilter: "all",
      showArchived: false,
      manualOrder: [],
      searchOpen: false,

      togglePin: (agentId) =>
        set((state) => {
          const current = state.agentPrefs[agentId] || DEFAULT_PREFS;
          return {
            agentPrefs: {
              ...state.agentPrefs,
              [agentId]: { ...current, pinned: !current.pinned },
            },
          };
        }),

      toggleArchive: (agentId) =>
        set((state) => {
          const current = state.agentPrefs[agentId] || DEFAULT_PREFS;
          return {
            agentPrefs: {
              ...state.agentPrefs,
              [agentId]: { ...current, archived: !current.archived },
            },
          };
        }),

      setDisplayName: (agentId, name) =>
        set((state) => {
          const current = state.agentPrefs[agentId] || DEFAULT_PREFS;
          return {
            agentPrefs: {
              ...state.agentPrefs,
              [agentId]: { ...current, displayName: name },
            },
          };
        }),

      setSearchQuery: (query) => set({ searchQuery: query }),
      setStatusFilter: (filter) => set({ statusFilter: filter }),
      setShowArchived: (show) => set({ showArchived: show }),
      setSearchOpen: (open) => set({ searchOpen: open }),

      removeAgentPrefs: (agentId) =>
        set((state) => {
          const { [agentId]: _, ...rest } = state.agentPrefs;
          return {
            agentPrefs: rest,
            manualOrder: state.manualOrder.filter((id) => id !== agentId),
          };
        }),

      getPrefs: (agentId) => {
        return get().agentPrefs[agentId] || DEFAULT_PREFS;
      },

      setManualOrder: (order) => set({ manualOrder: order }),

      moveAgent: (fromId, toId) =>
        set((state) => {
          const order = [...state.manualOrder];
          const fromIdx = order.indexOf(fromId);
          const toIdx = order.indexOf(toId);
          if (fromIdx === -1 || toIdx === -1) return state;
          order.splice(fromIdx, 1);
          order.splice(toIdx, 0, fromId);
          return { manualOrder: order };
        }),
    }),
    {
      name: "chorus-sidebar-prefs",
      partialize: (state) => ({
        agentPrefs: state.agentPrefs,
        showArchived: state.showArchived,
        manualOrder: state.manualOrder,
      }),
      migrate: (persisted: unknown, version: number) => {
        // One-time migration from old key
        const oldKey = "cc-sidebar-prefs";
        const oldData = localStorage.getItem(oldKey);
        if (oldData) {
          localStorage.setItem("chorus-sidebar-prefs", oldData);
          localStorage.removeItem(oldKey);
        }

        const state = persisted as Record<string, unknown>;
        // Reset "queued" filter to "all"
        if (state.statusFilter === "queued") {
          state.statusFilter = "all";
        }
        // v1 -> v2: add manualOrder
        if (version < 2 && !state.manualOrder) {
          state.manualOrder = [];
        }
        return state;
      },
      version: 2,
    }
  )
);
