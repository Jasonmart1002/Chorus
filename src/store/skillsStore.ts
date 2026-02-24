import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { SkillsData } from "../types/skills";
import { toast } from "./toastStore";

interface SkillsStore {
  data: SkillsData | null;
  loading: boolean;
  error: string | null;
  searchQuery: string;
  expandedPluginId: string | null;

  fetchSkills: () => Promise<void>;
  setSearchQuery: (query: string) => void;
  togglePlugin: (pluginId: string) => void;
}

export const useSkillsStore = create<SkillsStore>((set, get) => ({
  data: null,
  loading: false,
  error: null,
  searchQuery: "",
  expandedPluginId: null,

  fetchSkills: async () => {
    if (get().loading) return;
    set({ loading: true, error: null });
    try {
      const data = await invoke<SkillsData>("get_installed_skills");
      set({ data, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      set({ error: message, loading: false });
      toast.error(`Failed to load skills: ${message}`);
    }
  },

  setSearchQuery: (query) => set({ searchQuery: query }),

  togglePlugin: (pluginId) =>
    set((state) => ({
      expandedPluginId: state.expandedPluginId === pluginId ? null : pluginId,
    })),
}));
