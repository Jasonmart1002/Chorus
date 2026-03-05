import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { McpServer } from "../types/mcp";
import { toast } from "./toastStore";

interface McpStore {
  servers: McpServer[];
  loading: boolean;
  fetchServers: () => Promise<void>;
  addServer: (
    name: string,
    transport: string,
    commandOrUrl: string,
    args: string[],
    env: Record<string, string>,
    scope: string
  ) => Promise<void>;
  removeServer: (name: string, scope: string) => Promise<void>;
}

export const useMcpStore = create<McpStore>((set, get) => ({
  servers: [],
  loading: false,

  fetchServers: async () => {
    set({ loading: true });
    try {
      const servers = await invoke<McpServer[]>("mcp_list");
      set({ servers, loading: false });
    } catch (err) {
      toast.error(`Failed to list MCP servers: ${String(err)}`);
      set({ loading: false });
    }
  },

  addServer: async (name, transport, commandOrUrl, args, env, scope) => {
    try {
      await invoke("mcp_add", { name, transport, commandOrUrl, args, env, scope });
      toast.success(`MCP server "${name}" added`);
      await get().fetchServers();
    } catch (err) {
      toast.error(`Failed to add MCP server: ${String(err)}`);
      throw err;
    }
  },

  removeServer: async (name, scope) => {
    try {
      await invoke("mcp_remove", { name, scope });
      toast.success(`MCP server "${name}" removed`);
      set((s) => ({ servers: s.servers.filter((srv) => srv.name !== name) }));
    } catch (err) {
      toast.error(`Failed to remove MCP server: ${String(err)}`);
      throw err;
    }
  },
}));
