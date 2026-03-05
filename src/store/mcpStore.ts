import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { McpServer } from "../types/mcp";
import { toast } from "./toastStore";

interface McpStore {
  servers: McpServer[];
  loading: boolean;
  fetchServers: (cwd?: string) => Promise<void>;
  addServer: (
    name: string,
    transport: string,
    commandOrUrl: string,
    args: string[],
    env: Record<string, string>,
    scope: string,
    cwd?: string,
  ) => Promise<void>;
  removeServer: (name: string, scope: string, cwd?: string) => Promise<void>;
}

export const useMcpStore = create<McpStore>((set, get) => ({
  servers: [],
  loading: false,

  fetchServers: async (cwd) => {
    set({ loading: true });
    try {
      const servers = await invoke<McpServer[]>("mcp_list", {
        cwd: cwd || null,
      });
      set({ servers, loading: false });
    } catch (err) {
      toast.error(`Failed to list MCP servers: ${String(err)}`);
      set({ loading: false });
    }
  },

  addServer: async (name, transport, commandOrUrl, args, env, scope, cwd) => {
    try {
      await invoke("mcp_add", {
        name,
        transport,
        commandOrUrl,
        args,
        env,
        scope,
        cwd: cwd || null,
      });
      toast.success(`MCP server "${name}" added`);
      await get().fetchServers(cwd);
    } catch (err) {
      toast.error(`Failed to add MCP server: ${String(err)}`);
      throw err;
    }
  },

  removeServer: async (name, scope, cwd) => {
    try {
      await invoke("mcp_remove", { name, scope, cwd: cwd || null });
      toast.success(`MCP server "${name}" removed`);
      set((state) => ({
        servers: state.servers.filter(
          (server) =>
            !(server.name === name && (server.scope || "user") === scope),
        ),
      }));
    } catch (err) {
      toast.error(`Failed to remove MCP server: ${String(err)}`);
      throw err;
    }
  },
}));
