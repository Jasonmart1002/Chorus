import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { Agent, AgentStatus } from "../types/agent";
import type {
  AgentMessageEvent,
  StatusChangeEvent,
  AttentionEvent,
  SDKMessage,
} from "../types/messages";
import { useSidebarStore } from "./sidebarStore";
import { toast } from "./toastStore";

export type ViewMode = "agents" | "skills" | "automations";

export interface CommandState {
  cwd: string;
  command: string;
  running: boolean;
  lines: string[];
  exitCode: number | null | undefined; // undefined = still running
}

interface AgentStore {
  agents: Record<string, Agent>;
  messages: Record<string, SDKMessage[]>;
  attentionSet: Record<string, boolean>;
  selectedAgentId: string | null;
  initialized: boolean;

  // Running command states per CWD
  commandStates: Record<string, CommandState>;
  savedCommands: Record<string, string>; // cwd → last command

  // Vibe mode
  vibeMode: boolean;
  vibeCurrentId: string | null;
  attentionTimestamps: Record<string, number>; // agent_id → Date.now() when entered queue

  // View mode
  viewMode: ViewMode;

  // Pending action (triggered by global shortcuts, consumed by ContextSummary)
  pendingAction: 'git' | 'terminal' | 'run' | null;

  // Actions
  setViewMode: (mode: ViewMode) => void;
  clearPendingAction: () => void;
  init: () => Promise<void>;
  createAgent: (
    name: string,
    cwd: string,
    model?: string,
    permissionMode?: string
  ) => Promise<string>;
  sendPrompt: (agentId: string, text: string) => Promise<void>;
  stopAgent: (agentId: string) => Promise<void>;
  killAgent: (agentId: string) => Promise<void>;
  removeAgent: (agentId: string) => Promise<void>;
  selectAgent: (agentId: string | null) => void;
  toggleVibeMode: () => void;
  setVibeMode: (on: boolean) => void;
  vibeSkip: () => void;
  startCommand: (
    cwd: string,
    command: string,
    envVars?: Record<string, string>
  ) => void;
  killRunningCommand: (cwd: string) => Promise<void>;
  dismissCommandOutput: (cwd: string) => void;
  openTerminal: (cwd: string) => Promise<void>;
  openClaudeTerminal: (cwd: string, sessionId: string) => Promise<void>;
}

/** Find the next awaiting_input agent by oldest attention timestamp, excluding `excludeId` */
function nextVibeAgent(
  attentionSet: Record<string, boolean>,
  attentionTimestamps: Record<string, number>,
  excludeId?: string
): string | null {
  const ids = Object.keys(attentionSet).filter((id) => id !== excludeId);
  if (ids.length === 0) return null;
  ids.sort((a, b) => (attentionTimestamps[a] || 0) - (attentionTimestamps[b] || 0));
  return ids[0];
}

export const useAgentStore = create<AgentStore>((set, get) => ({
  agents: {},
  messages: {},
  attentionSet: {},
  selectedAgentId: null,
  initialized: false,
  commandStates: {},
  savedCommands: {},
  vibeMode: false,
  vibeCurrentId: null,
  attentionTimestamps: {},
  viewMode: "agents" as ViewMode,
  pendingAction: null,

  setViewMode: (mode) => set({ viewMode: mode, vibeMode: false }),
  clearPendingAction: () => set({ pendingAction: null }),

  init: async () => {
    if (get().initialized) return;
    set({ initialized: true }); // Set synchronously to prevent double-init from StrictMode

    // Listen for agent messages
    await listen<AgentMessageEvent>("agent-message", (event) => {
      const { agent_id, message } = event.payload;
      set((state) => ({
        messages: {
          ...state.messages,
          [agent_id]: [...(state.messages[agent_id] || []), message],
        },
      }));

      // Notify on context compaction
      if (message.type === "system") {
        const subtype = (message as { subtype?: string }).subtype || "";
        const source = (message as Record<string, unknown>).source;
        const isCompact =
          subtype.toLowerCase().includes("compact") ||
          (subtype.toLowerCase().includes("session") && source === "compact");
        if (isCompact) {
          const agentName = get().agents[agent_id]?.config.name || "Agent";
          toast.info(`${agentName}: context compacted`);
        }
      }

      // Update cost/turns from result messages
      if (message.type === "result") {
        const costUsd = message.total_cost_usd;
        const numTurns = message.num_turns;
        if (costUsd !== undefined || numTurns !== undefined) {
          set((state) => {
            const agent = state.agents[agent_id];
            if (!agent) return state;
            return {
              agents: {
                ...state.agents,
                [agent_id]: {
                  ...agent,
                  cost_usd: costUsd ?? agent.cost_usd,
                  num_turns: numTurns ?? agent.num_turns,
                },
              },
            };
          });
        }
      }
    });

    // Listen for status changes
    await listen<StatusChangeEvent>("agent-status-changed", (event) => {
      const { agent_id, status } = event.payload;
      set((state) => {
        const agent = state.agents[agent_id];
        if (!agent) return state;
        const updates: Partial<AgentStore> = {
          agents: {
            ...state.agents,
            [agent_id]: {
              ...agent,
              status: status as AgentStatus,
            },
          },
        };
        // Vibe mode: if the current agent is no longer awaiting input, advance
        if (
          state.vibeMode &&
          state.vibeCurrentId === agent_id &&
          status !== "awaiting_input"
        ) {
          updates.vibeCurrentId = nextVibeAgent(
            state.attentionSet,
            state.attentionTimestamps,
            agent_id
          );
        }
        return updates;
      });
    });

    // Listen for attention events (agent needs user input or errored)
    await listen<AttentionEvent>("agent-entered-queue", (event) => {
      const { agent_id } = event.payload;
      set((state) => {
        const updates: Partial<AgentStore> = {
          attentionSet: { ...state.attentionSet, [agent_id]: true },
          attentionTimestamps: {
            ...state.attentionTimestamps,
            [agent_id]: Date.now(),
          },
        };
        // Vibe mode: auto-navigate from waiting screen
        if (state.vibeMode && state.vibeCurrentId === null) {
          updates.vibeCurrentId = agent_id;
        }
        return updates;
      });
    });

    // Listen for streaming command output
    await listen<{ cwd: string; line: string; stream: string }>("command-output", (event) => {
      const { cwd, line } = event.payload;
      set((state) => {
        const cs = state.commandStates[cwd];
        if (!cs) return state;
        return {
          commandStates: {
            ...state.commandStates,
            [cwd]: { ...cs, lines: [...cs.lines, line] },
          },
        };
      });
    });

    // Listen for command completion (only toast for tracked commands, not diffs)
    await listen<{ cwd: string; exit_code: number | null }>("command-done", (event) => {
      const { cwd, exit_code } = event.payload;
      const tracked = get().commandStates[cwd];
      if (tracked) {
        if (exit_code === 0) {
          toast.success("Command completed");
        } else if (exit_code !== null) {
          toast.error(`Command exited with code ${exit_code}`);
        }
      }
      set((state) => {
        const cs = state.commandStates[cwd];
        if (!cs) return state;
        return {
          commandStates: {
            ...state.commandStates,
            [cwd]: { ...cs, running: false, exitCode: exit_code },
          },
        };
      });
    });

    // Refresh agent list from backend
    try {
      const agents = await invoke<Agent[]>("list_agents");
      const agentMap: Record<string, Agent> = {};
      for (const agent of agents) {
        agentMap[agent.id] = agent;
      }
      set({ agents: agentMap });
    } catch {
      // No agents yet
    }
  },

  createAgent: async (name, cwd, model, permissionMode) => {
    const result = await invoke<{ agent_id: string; session_id: string }>("create_agent", {
      name,
      cwd,
      model: model || null,
      permissionMode: permissionMode || null,
    });

    const agent: Agent = {
      id: result.agent_id,
      config: {
        name,
        cwd,
        model,
        permission_mode: permissionMode || "bypassPermissions",
      },
      status: "idle",
      session_id: result.session_id,
      created_at: new Date().toISOString(),
      cost_usd: 0,
      num_turns: 0,
    };

    set((state) => ({
      agents: { ...state.agents, [result.agent_id]: agent },
      messages: { ...state.messages, [result.agent_id]: [] },
      selectedAgentId: result.agent_id,
    }));

    toast.success("Agent created");
    return result.agent_id;
  },

  sendPrompt: async (agentId, text) => {
    const userMsg: SDKMessage = { type: "user_prompt" as const, text, timestamp: Date.now() };
    set((state) => {
      const { [agentId]: _, ...restAttention } = state.attentionSet;
      const { [agentId]: _ts, ...restTimestamps } = state.attentionTimestamps;
      const updates: Partial<AgentStore> = {
        messages: {
          ...state.messages,
          [agentId]: [...(state.messages[agentId] || []), userMsg],
        },
        attentionSet: restAttention,
        attentionTimestamps: restTimestamps,
      };
      // Vibe mode: advance to next waiting agent
      if (state.vibeMode) {
        updates.vibeCurrentId = nextVibeAgent(
          restAttention,
          restTimestamps
        );
      }
      return updates;
    });
    try {
      await invoke("send_prompt", { agentId, text });
    } catch (err) {
      toast.error(`Failed to send: ${String(err)}`);
      throw err;
    }
  },

  stopAgent: async (agentId) => {
    await invoke("stop_agent", { agentId });
  },

  killAgent: async (agentId) => {
    await invoke("kill_agent", { agentId });
  },

  removeAgent: async (agentId) => {
    await invoke("remove_agent", { agentId });
    useSidebarStore.getState().removeAgentPrefs(agentId);
    set((state) => {
      const { [agentId]: _removed, ...remainingAgents } = state.agents;
      const { [agentId]: _removedMsgs, ...remainingMessages } = state.messages;
      const { [agentId]: _removedAttn, ...remainingAttention } = state.attentionSet;
      const { [agentId]: _removedTs, ...remainingTimestamps } = state.attentionTimestamps;
      const updates: Partial<AgentStore> = {
        agents: remainingAgents,
        messages: remainingMessages,
        attentionSet: remainingAttention,
        attentionTimestamps: remainingTimestamps,
        selectedAgentId:
          state.selectedAgentId === agentId ? null : state.selectedAgentId,
      };
      // Vibe mode: advance if removed agent was current
      if (state.vibeMode && state.vibeCurrentId === agentId) {
        updates.vibeCurrentId = nextVibeAgent(
          remainingAttention,
          remainingTimestamps
        );
      }
      return updates;
    });
    toast.info("Agent removed");
  },

  selectAgent: (agentId) => {
    set((state) => {
      if (agentId && state.attentionSet[agentId]) {
        const { [agentId]: _, ...restAttention } = state.attentionSet;
        return { selectedAgentId: agentId, attentionSet: restAttention, viewMode: "agents" as ViewMode };
      }
      return { selectedAgentId: agentId, viewMode: "agents" as ViewMode };
    });
  },

  toggleVibeMode: () => {
    const state = get();
    if (state.vibeMode) {
      set({ vibeMode: false, vibeCurrentId: null });
    } else {
      const first = nextVibeAgent(state.attentionSet, state.attentionTimestamps);
      set({ vibeMode: true, vibeCurrentId: first, viewMode: "agents" as ViewMode });
    }
  },

  setVibeMode: (on) => {
    if (on) {
      const state = get();
      const first = nextVibeAgent(state.attentionSet, state.attentionTimestamps);
      set({ vibeMode: true, vibeCurrentId: first });
    } else {
      set({ vibeMode: false, vibeCurrentId: null });
    }
  },

  vibeSkip: () => {
    const state = get();
    if (!state.vibeMode || !state.vibeCurrentId) return;
    const skippedId = state.vibeCurrentId;
    // Push skipped agent to back of queue by giving it the newest timestamp
    const updatedTimestamps = {
      ...state.attentionTimestamps,
      [skippedId]: Date.now(),
    };
    const next = nextVibeAgent(state.attentionSet, updatedTimestamps, skippedId);
    set({
      attentionTimestamps: updatedTimestamps,
      // If there's another agent, go to it; otherwise stay on this one (only one in queue)
      vibeCurrentId: next ?? skippedId,
    });
  },

  startCommand: (cwd, command, envVars) => {
    set((state) => ({
      savedCommands: { ...state.savedCommands, [cwd]: command },
      commandStates: {
        ...state.commandStates,
        [cwd]: { cwd, command, running: true, lines: [], exitCode: undefined },
      },
    }));

    invoke("run_command", {
      cwd,
      command,
      envVars: envVars || null,
    }).catch((err) => {
      toast.error(`Command failed: ${String(err)}`);
      set((state) => {
        const cs = state.commandStates[cwd];
        if (!cs) return state;
        return {
          commandStates: {
            ...state.commandStates,
            [cwd]: {
              ...cs,
              running: false,
              lines: [...cs.lines, `Error: ${String(err)}`],
              exitCode: 1,
            },
          },
        };
      });
    });
  },

  killRunningCommand: async (cwd) => {
    await invoke("kill_running_command", { cwd });
  },

  dismissCommandOutput: (cwd) => {
    set((state) => {
      const { [cwd]: _removed, ...rest } = state.commandStates;
      return { commandStates: rest };
    });
  },

  openTerminal: async (cwd) => {
    await invoke("open_terminal", { cwd });
  },

  openClaudeTerminal: async (cwd, sessionId) => {
    await invoke("open_claude_terminal", { cwd, sessionId });
  },
}));
