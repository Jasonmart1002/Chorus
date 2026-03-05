import { invoke } from "@tauri-apps/api/core";

export const IS_MAC = navigator.platform.toUpperCase().includes("MAC");
export const IS_WINDOWS = navigator.platform.toUpperCase().includes("WIN");
export const MOD_KEY = IS_MAC ? "\u2318" : "Ctrl";
export const MOD_LABEL = IS_MAC ? "Cmd" : "Ctrl";
export const SHIFT_KEY = IS_MAC ? "\u21E7" : "Shift";

/** Extract last directory segment from a path (handles / and \) */
export function basename(path: string): string {
  return path.split(/[\\/]/).filter(Boolean).pop() || path;
}

/** Cached home directory */
let _homeDir: string | null = null;

/** Get the user's home directory */
export async function homeDir(): Promise<string> {
  if (_homeDir) return _homeDir;
  try {
    _homeDir = await invoke<string>("get_home_dir");
  } catch {
    _homeDir = "/tmp";
  }
  return _homeDir;
}
