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

  // Actions
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

export const useAgentStore = create<AgentStore>((set, get) => ({
  agents: {},
  messages: {},
  attentionSet: {},
  selectedAgentId: null,
  initialized: false,
  commandStates: {},
  savedCommands: {},

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

      // Update cost/turns from result messages
      if ((message as Record<string, unknown>).type === "result") {
        const result = message as Record<string, unknown>;
        const costUsd = result.total_cost_usd as number | undefined;
        const numTurns = result.num_turns as number | undefined;
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
        return {
          agents: {
            ...state.agents,
            [agent_id]: {
              ...agent,
              status: status as AgentStatus,
            },
          },
        };
      });
    });

    // Listen for attention events (agent needs user input or errored)
    await listen<AttentionEvent>("agent-entered-queue", (event) => {
      const { agent_id } = event.payload;
      set((state) => ({
        attentionSet: { ...state.attentionSet, [agent_id]: true },
      }));
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
    const userMsg = { type: "user_prompt", text, timestamp: Date.now() };
    set((state) => {
      const { [agentId]: _, ...restAttention } = state.attentionSet;
      return {
        messages: {
          ...state.messages,
          [agentId]: [...(state.messages[agentId] || []), userMsg],
        },
        attentionSet: restAttention,
      };
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
      return {
        agents: remainingAgents,
        messages: remainingMessages,
        attentionSet: remainingAttention,
        selectedAgentId:
          state.selectedAgentId === agentId ? null : state.selectedAgentId,
      };
    });
    toast.info("Agent removed");
  },

  selectAgent: (agentId) => {
    set((state) => {
      if (agentId && state.attentionSet[agentId]) {
        const { [agentId]: _, ...restAttention } = state.attentionSet;
        return { selectedAgentId: agentId, attentionSet: restAttention };
      }
      return { selectedAgentId: agentId };
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
