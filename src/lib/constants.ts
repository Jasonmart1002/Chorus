import type { ThemeColors } from "./theme";

export function getStatusColors(theme: ThemeColors): Record<string, string> {
  return {
    idle: theme.statusIdle,
    working: theme.statusWorking,
    awaiting_input: theme.statusReady,
    errored: theme.statusError,
    exited: theme.statusIdle,
  };
}

export const STATUS_LABELS: Record<string, string> = {
  idle: "Idle",
  working: "Working",
  awaiting_input: "Awaiting Input",
  errored: "Errored",
  exited: "Exited",
};

export const DEFAULT_PERMISSION_MODE = "bypassPermissions";
