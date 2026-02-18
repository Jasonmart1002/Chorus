import { useEffect, useState, useCallback } from "react";
import { useAgentStore } from "../store/agentStore";
import { useSidebarStore } from "../store/sidebarStore";
import { useThemeStore } from "../store/themeStore";
import { sortAgents } from "../lib/sortAgents";
import { useNotifications } from "../hooks/useNotifications";
import { Sidebar } from "./Sidebar/Sidebar";
import { MainPanel } from "./MainPanel/MainPanel";
import { NewAgentDialog } from "./NewAgentDialog";
import { ShortcutsDialog } from "./ShortcutsDialog";
import { ToastContainer } from "./ui/ToastContainer";

export function Layout() {
  const init = useAgentStore((s) => s.init);
  const agents = useAgentStore((s) => s.agents);
  const selectAgent = useAgentStore((s) => s.selectAgent);
  const theme = useThemeStore((s) => s.current);
  const [showNewAgent, setShowNewAgent] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  useNotifications();

  useEffect(() => {
    init();
  }, [init]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;

      // Cmd+Shift shortcuts
      if (meta && e.shiftKey) {
        switch (e.key.toLowerCase()) {
          case "v": // Toggle vibe mode
            e.preventDefault();
            useAgentStore.getState().toggleVibeMode();
            return;
          case "t": // Toggle theme
            e.preventDefault();
            useThemeStore.getState().toggle();
            return;
          case "j": // Previous agent
            e.preventDefault();
            {
              const sidebarState = useSidebarStore.getState();
              const getPrefs = sidebarState.getPrefs;
              const visible = sortAgents(
                Object.values(agents).filter((a) => !getPrefs(a.id).archived),
                getPrefs,
                sidebarState.manualOrder
              );
              if (visible.length === 0) return;
              const currentId = useAgentStore.getState().selectedAgentId;
              const idx = visible.findIndex((a) => a.id === currentId);
              const prev = idx <= 0 ? visible.length - 1 : idx - 1;
              selectAgent(visible[prev].id);
            }
            return;
          case "s": // Vibe skip
            if (useAgentStore.getState().vibeMode) {
              e.preventDefault();
              useAgentStore.getState().vibeSkip();
            }
            return;
          case "g": // Open Git menu
            if (useAgentStore.getState().selectedAgentId) {
              e.preventDefault();
              useAgentStore.setState({ pendingAction: 'git' });
            }
            return;
          case "r": // Open Run dialog
            if (useAgentStore.getState().selectedAgentId) {
              e.preventDefault();
              useAgentStore.setState({ pendingAction: 'run' });
            }
            return;
          case "e": // Open Terminal menu
            if (useAgentStore.getState().selectedAgentId) {
              e.preventDefault();
              useAgentStore.setState({ pendingAction: 'terminal' });
            }
            return;
        }
        return;
      }

      // Escape — exit vibe mode or close shortcuts
      if (e.key === "Escape") {
        if (showShortcuts) {
          setShowShortcuts(false);
          return;
        }
        if (useAgentStore.getState().vibeMode) {
          e.preventDefault();
          useAgentStore.getState().setVibeMode(false);
          return;
        }
      }

      // Cmd-only shortcuts (no shift)
      if (meta && !e.shiftKey) {
        switch (e.key.toLowerCase()) {
          case "n": // New agent
            e.preventDefault();
            setShowNewAgent(true);
            return;
          case "k": // Keyboard shortcuts cheat sheet
            e.preventDefault();
            setShowShortcuts((v) => !v);
            return;
          case "f": // Focus sidebar search
            e.preventDefault();
            useSidebarStore.getState().triggerFocusSearch();
            return;
          case "l": // Focus prompt input
            e.preventDefault();
            document.querySelector<HTMLTextAreaElement>("textarea")?.focus();
            return;
          case "j": // Next agent
            e.preventDefault();
            {
              const sidebarState = useSidebarStore.getState();
              const getPrefs = sidebarState.getPrefs;
              const visible = sortAgents(
                Object.values(agents).filter((a) => !getPrefs(a.id).archived),
                getPrefs,
                sidebarState.manualOrder
              );
              if (visible.length === 0) return;
              const currentId = useAgentStore.getState().selectedAgentId;
              const idx = visible.findIndex((a) => a.id === currentId);
              const next = idx < 0 || idx >= visible.length - 1 ? 0 : idx + 1;
              selectAgent(visible[next].id);
            }
            return;
        }

        // Cmd+1-9 — select agent by index
        if (e.key >= "1" && e.key <= "9") {
          e.preventDefault();
          const idx = parseInt(e.key) - 1;
          const sidebarState = useSidebarStore.getState();
          const getPrefs = sidebarState.getPrefs;
          const visibleAgents = sortAgents(
            Object.values(agents).filter((a) => !getPrefs(a.id).archived),
            getPrefs,
            sidebarState.manualOrder
          );
          if (idx < visibleAgents.length) {
            selectAgent(visibleAgents[idx].id);
          }
          return;
        }
      }
    },
    [agents, selectAgent, showShortcuts]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "row",
        background: theme.bgBase,
        color: theme.textPrimary,
        fontFamily: theme.fontBody,
        overflow: "hidden",
        transition: "background-color 0.3s ease, color 0.3s ease",
      }}
    >
      <Sidebar onNewAgent={() => setShowNewAgent(true)} />
      <div style={{ flex: 1, height: "100vh", minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <MainPanel />
      </div>
      {showNewAgent && <NewAgentDialog onClose={() => setShowNewAgent(false)} />}
      {showShortcuts && <ShortcutsDialog onClose={() => setShowShortcuts(false)} />}
      <ToastContainer />
    </div>
  );
}
