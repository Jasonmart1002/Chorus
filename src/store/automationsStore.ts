import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type {
  Automation,
  AutomationSchedule,
  AutomationTarget,
} from "../types/automations";
import { toast } from "./toastStore";

interface AutomationsStore {
  automations: Automation[];
  loading: boolean;
  searchQuery: string;
  showCreateDialog: boolean;
  editingId: string | null;
  initialized: boolean;

  fetchAutomations: () => Promise<void>;
  createAutomation: (
    name: string,
    prompt: string,
    schedule: AutomationSchedule,
    target: AutomationTarget
  ) => Promise<void>;
  updateAutomation: (
    id: string,
    updates: {
      name?: string;
      prompt?: string;
      schedule?: AutomationSchedule;
      target?: AutomationTarget;
      enabled?: boolean;
    }
  ) => Promise<void>;
  deleteAutomation: (id: string) => Promise<void>;
  toggleEnabled: (id: string) => Promise<void>;
  runNow: (id: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
  setShowCreateDialog: (show: boolean) => void;
  setEditingId: (id: string | null) => void;
  initListener: () => Promise<void>;
}

export const useAutomationsStore = create<AutomationsStore>((set, get) => ({
  automations: [],
  loading: false,
  searchQuery: "",
  showCreateDialog: false,
  editingId: null,
  initialized: false,

  fetchAutomations: async () => {
    if (get().loading) return;
    set({ loading: true });
    try {
      const automations = await invoke<Automation[]>("list_automations");
      set({ automations, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      set({ loading: false });
      toast.error(`Failed to load automations: ${message}`);
    }
  },

  createAutomation: async (name, prompt, schedule, target) => {
    try {
      const automation = await invoke<Automation>("create_automation", {
        name,
        prompt,
        schedule,
        target,
      });
      set((state) => ({
        automations: [...state.automations, automation],
        showCreateDialog: false,
      }));
      toast.success("Automation created");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to create automation: ${message}`);
      throw err;
    }
  },

  updateAutomation: async (id, updates) => {
    try {
      const automation = await invoke<Automation>("update_automation", {
        id,
        ...updates,
      });
      set((state) => ({
        automations: state.automations.map((a) =>
          a.id === id ? automation : a
        ),
        editingId: null,
        showCreateDialog: false,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to update automation: ${message}`);
      throw err;
    }
  },

  deleteAutomation: async (id) => {
    try {
      await invoke("delete_automation", { id });
      set((state) => ({
        automations: state.automations.filter((a) => a.id !== id),
      }));
      toast.info("Automation deleted");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to delete automation: ${message}`);
    }
  },

  toggleEnabled: async (id) => {
    const automation = get().automations.find((a) => a.id === id);
    if (!automation) return;
    try {
      const updated = await invoke<Automation>("update_automation", {
        id,
        enabled: !automation.enabled,
      });
      set((state) => ({
        automations: state.automations.map((a) =>
          a.id === id ? updated : a
        ),
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to toggle automation: ${message}`);
    }
  },

  runNow: async (id) => {
    try {
      await invoke<string>("run_automation_now", { id });
      toast.success("Automation triggered");
      // Refresh to get updated stats
      get().fetchAutomations();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to run automation: ${message}`);
    }
  },

  setSearchQuery: (query) => set({ searchQuery: query }),
  setShowCreateDialog: (show) => set({ showCreateDialog: show, editingId: show ? get().editingId : null }),
  setEditingId: (id) => set({ editingId: id, showCreateDialog: id !== null }),

  initListener: async () => {
    if (get().initialized) return;
    set({ initialized: true });

    await listen<{ automation_id: string; automation_name: string; agent_id: string }>(
      "automation-fired",
      (event) => {
        toast.info(`Automation "${event.payload.automation_name}" fired`);
        // Refresh to get updated stats
        get().fetchAutomations();
      }
    );
  },
}));
