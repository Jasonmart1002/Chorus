import { create } from "zustand";
import { persist } from "zustand/middleware";
import { lightTheme, darkTheme, type ThemeColors } from "../lib/theme";

type ThemeMode = "light" | "dark";

interface ThemeStore {
  mode: ThemeMode;
  current: ThemeColors;
  toggle: () => void;
}

function applyBodyClass(mode: ThemeMode) {
  document.body.className = `theme-${mode}`;
}

function themeFor(mode: ThemeMode): ThemeColors {
  return mode === "dark" ? darkTheme : lightTheme;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      mode: "light",
      current: lightTheme,
      toggle: () =>
        set((state) => {
          const next: ThemeMode = state.mode === "light" ? "dark" : "light";
          applyBodyClass(next);
          return { mode: next, current: themeFor(next) };
        }),
    }),
    {
      name: "cc-theme",
      partialize: (state) => ({ mode: state.mode }),
      merge: (persisted, current) => {
        const p = persisted as { mode?: ThemeMode } | undefined;
        const mode = p?.mode || "light";
        applyBodyClass(mode);
        return { ...current, mode, current: themeFor(mode) };
      },
    }
  )
);
