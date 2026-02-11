import type { Agent } from "../types/agent";
import type { AgentPrefs } from "../store/sidebarStore";

const DEFAULT_PREFS: AgentPrefs = { pinned: false, archived: false, displayName: null };

export function sortAgents(
  agents: Agent[],
  getPrefs: (agentId: string) => AgentPrefs,
  manualOrder?: string[]
): Agent[] {
  return [...agents].sort((a, b) => {
    const aPrefs = getPrefs(a.id) || DEFAULT_PREFS;
    const bPrefs = getPrefs(b.id) || DEFAULT_PREFS;

    // Pinned first
    if (aPrefs.pinned && !bPrefs.pinned) return -1;
    if (!aPrefs.pinned && bPrefs.pinned) return 1;

    // Within same pin group, sort by manual order if provided
    if (manualOrder && manualOrder.length > 0) {
      const aIdx = manualOrder.indexOf(a.id);
      const bIdx = manualOrder.indexOf(b.id);
      const aPos = aIdx === -1 ? Infinity : aIdx;
      const bPos = bIdx === -1 ? Infinity : bIdx;
      if (aPos !== bPos) return aPos - bPos;
    }

    // Fallback: by created_at
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
}

export function getDisplayName(
  agent: Agent,
  prefs: AgentPrefs | undefined
): string {
  return prefs?.displayName || agent.config.name;
}
