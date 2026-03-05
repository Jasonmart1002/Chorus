import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { HookEntry, HookEventName, SkillFile } from "../types/hooks";
import { toast } from "./toastStore";
import { homeDir } from "../lib/platform";

interface HooksStore {
  hooks: HookEntry[];
  skills: SkillFile[];
  loading: boolean;
  fetchHooks: () => Promise<void>;
  saveHooks: (
    hooks: HookEntry[],
    scope: "user" | "project",
    projectCwd?: string,
  ) => Promise<void>;
  fetchSkills: (projectCwd?: string) => Promise<void>;
  readSkill: (path: string) => Promise<string>;
  saveSkill: (path: string, content: string) => Promise<void>;
}

async function readSettingsJson(
  path: string,
): Promise<Record<string, unknown>> {
  try {
    const content = await invoke<string>("read_file", { path });
    return JSON.parse(content);
  } catch {
    return {};
  }
}

export const useHooksStore = create<HooksStore>((set) => ({
  hooks: [],
  skills: [],
  loading: false,

  fetchHooks: async () => {
    set({ loading: true });
    try {
      const home = await homeDir();
      const userPath = `${home}/.claude/settings.json`;
      const userSettings = await readSettingsJson(userPath);
      const hooks: HookEntry[] = [];

      const rawHooks = (userSettings.hooks || {}) as Record<string, unknown>;
      for (const [eventName, entries] of Object.entries(rawHooks)) {
        if (Array.isArray(entries)) {
          for (const entry of entries) {
            hooks.push({
              type: eventName as HookEventName,
              matcher: entry.matcher,
              hooks: Array.isArray(entry.hooks) ? entry.hooks : [],
            });
          }
        }
      }

      set({ hooks, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  saveHooks: async (hooks, scope, projectCwd) => {
    try {
      const home = await homeDir();
      const path =
        scope === "project" && projectCwd
          ? `${projectCwd}/.claude/settings.json`
          : `${home}/.claude/settings.json`;

      const settings = await readSettingsJson(path);

      // Group hooks by event type
      const hooksObj: Record<string, unknown[]> = {};
      for (const hook of hooks) {
        if (!hooksObj[hook.type]) hooksObj[hook.type] = [];
        hooksObj[hook.type].push({
          ...(hook.matcher ? { matcher: hook.matcher } : {}),
          hooks: hook.hooks,
        });
      }

      settings.hooks = hooksObj;
      await invoke("write_file", {
        path,
        content: JSON.stringify(settings, null, 2),
      });
      set({ hooks });
      toast.success("Hooks saved");
    } catch (err) {
      toast.error(`Failed to save hooks: ${String(err)}`);
    }
  },

  fetchSkills: async (projectCwd) => {
    const skills: SkillFile[] = [];
    try {
      const home = await homeDir();

      // User skills
      const userDir = `${home}/.claude/skills`;
      try {
        const files = await invoke<string[]>("list_dir", { path: userDir });
        for (const f of files) {
          if (f.endsWith(".md")) {
            skills.push({ name: f, path: `${userDir}/${f}`, scope: "user" });
          }
        }
      } catch {
        /* dir doesn't exist */
      }

      // Project skills
      if (projectCwd) {
        const projDir = `${projectCwd}/.claude/skills`;
        try {
          const files = await invoke<string[]>("list_dir", { path: projDir });
          for (const f of files) {
            if (f.endsWith(".md")) {
              skills.push({
                name: f,
                path: `${projDir}/${f}`,
                scope: "project",
              });
            }
          }
        } catch {
          /* dir doesn't exist */
        }
      }
    } catch {
      // ignore
    }
    set({ skills });
  },

  readSkill: async (path) => {
    return invoke<string>("read_file", { path });
  },

  saveSkill: async (path, content) => {
    await invoke("write_file", { path, content });
    toast.success("Skill saved");
  },
}));
