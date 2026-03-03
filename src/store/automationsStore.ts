import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type {
  Automation,
  AutomationSchedule,
  AutomationTarget,
  RunningAutomation,
} from "../types/automations";
import { useAgentStore } from "./agentStore";
import { toast } from "./toastStore";

interface AutomationsStore {
  automations: Automation[];
  runningAutomations: Record<string, RunningAutomation>;
  loading: boolean;
  searchQuery: string;
  showCreateDialog: boolean;
  editingId: string | null;
  initialized: boolean;

  fetchAutomations: () => Promise<void>;
  fetchRunning: () => Promise<void>;
  createAutomation: (
    name: string,
    prompt: string,
    schedule: AutomationSchedule,
    target: AutomationTarget,
    skipPermissions?: boolean
  ) => Promise<void>;
  updateAutomation: (
    id: string,
    updates: {
      name?: string;
      prompt?: string;
      schedule?: AutomationSchedule;
      target?: AutomationTarget;
      enabled?: boolean;
      skip_permissions?: boolean;
    }
  ) => Promise<void>;
  deleteAutomation: (id: string) => Promise<void>;
  toggleEnabled: (id: string) => Promise<void>;
  runNow: (id: string) => Promise<void>;
  stopAutomation: (id: string) => Promise<void>;
  viewOutput: (id: string) => void;
  setSearchQuery: (query: string) => void;
  setShowCreateDialog: (show: boolean) => void;
  setEditingId: (id: string | null) => void;
  initListener: () => Promise<void>;
}

export const useAutomationsStore = create<AutomationsStore>((set, get) => ({
  automations: [],
  runningAutomations: {},
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

  fetchRunning: async () => {
    try {
      const running = await invoke<RunningAutomation[]>("get_running_automations");
      const map: Record<string, RunningAutomation> = {};
      for (const r of running) {
        map[r.automation_id] = r;
      }
      set({ runningAutomations: map });
    } catch {
      // Ignore — running state is transient
    }
  },

  createAutomation: async (name, prompt, schedule, target, skipPermissions) => {
    try {
      const automation = await invoke<Automation>("create_automation", {
        name,
        prompt,
        schedule,
        target,
        skipPermissions: skipPermissions || false,
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
      const agentId = await invoke<string>("run_automation_now", { id });
      const automation = get().automations.find((a) => a.id === id);
      // Optimistically set running state
      set((state) => ({
        runningAutomations: {
          ...state.runningAutomations,
          [id]: {
            automation_id: id,
            automation_name: automation?.name || "Automation",
            agent_id: agentId,
            started_at: new Date().toISOString(),
          },
        },
      }));
      toast.success("Automation started");
      // Refresh agent list so the automation-spawned agent appears in the frontend
      try {
        const agents = await invoke<import("../types/agent").Agent[]>("list_agents");
        const agentMap: Record<string, import("../types/agent").Agent> = {};
        for (const agent of agents) {
          agentMap[agent.id] = agent;
        }
        useAgentStore.setState({ agents: agentMap });
      } catch {
        // Non-critical — agent will appear on next refresh
      }
      get().fetchAutomations();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to run automation: ${message}`);
    }
  },

  stopAutomation: async (id) => {
    try {
      await invoke("stop_automation", { id });
      set((state) => {
        const { [id]: _removed, ...rest } = state.runningAutomations;
        return { runningAutomations: rest };
      });
      toast.info("Automation stopped");
      get().fetchAutomations();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to stop automation: ${message}`);
    }
  },

  viewOutput: async (id) => {
    const running = get().runningAutomations[id];
    if (!running) return;
    // Ensure the agent exists in the frontend store before navigating
    const agentStore = useAgentStore.getState();
    if (!agentStore.agents[running.agent_id]) {
      try {
        const agents = await invoke<import("../types/agent").Agent[]>("list_agents");
        const agentMap: Record<string, import("../types/agent").Agent> = {};
        for (const agent of agents) {
          agentMap[agent.id] = agent;
        }
        useAgentStore.setState({ agents: agentMap });
      } catch {
        // If we can't refresh, still try to navigate
      }
    }
    useAgentStore.getState().selectAgent(running.agent_id);
  },

  setSearchQuery: (query) => set({ searchQuery: query }),
  setShowCreateDialog: (show) => set({ showCreateDialog: show, editingId: show ? get().editingId : null }),
  setEditingId: (id) => set({ editingId: id, showCreateDialog: id !== null }),

  initListener: async () => {
    if (get().initialized) return;
    set({ initialized: true });

    // Fetch any automations that are already running (e.g. after app restart)
    get().fetchRunning();

    await listen<{ automation_id: string; automation_name: string; agent_id: string }>(
      "automation-fired",
      (event) => {
        toast.info(`Automation "${event.payload.automation_name}" fired`);
        get().fetchAutomations();
      }
    );

    await listen<{ automation_id: string; automation_name: string; agent_id: string }>(
      "automation-started",
      (event) => {
        set((state) => ({
          runningAutomations: {
            ...state.runningAutomations,
            [event.payload.automation_id]: {
              automation_id: event.payload.automation_id,
              automation_name: event.payload.automation_name,
              agent_id: event.payload.agent_id,
              started_at: new Date().toISOString(),
            },
          },
        }));
      }
    );

    await listen<{ automation_id: string; automation_name: string; agent_id: string }>(
      "automation-completed",
      (event) => {
        set((state) => {
          const { [event.payload.automation_id]: _removed, ...rest } =
            state.runningAutomations;
          return { runningAutomations: rest };
        });
        toast.success(
          `Automation "${event.payload.automation_name}" completed`
        );
        get().fetchAutomations();
      }
    );

    await listen<{ automation_id: string; automation_name: string; agent_id: string }>(
      "automation-stopped",
      (event) => {
        set((state) => {
          const { [event.payload.automation_id]: _removed, ...rest } =
            state.runningAutomations;
          return { runningAutomations: rest };
        });
        get().fetchAutomations();
      }
    );
  },
}));
