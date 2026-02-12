import { useEffect, useState, useCallback } from "react";
import { useAgentStore } from "../store/agentStore";
import { useSidebarStore } from "../store/sidebarStore";
import { useThemeStore } from "../store/themeStore";
import { sortAgents } from "../lib/sortAgents";
import { useNotifications } from "../hooks/useNotifications";
import { Sidebar } from "./Sidebar/Sidebar";
import { MainPanel } from "./MainPanel/MainPanel";
import { NewAgentDialog } from "./NewAgentDialog";
import { ToastContainer } from "./ui/ToastContainer";

export function Layout() {
  const init = useAgentStore((s) => s.init);
  const agents = useAgentStore((s) => s.agents);
  const selectAgent = useAgentStore((s) => s.selectAgent);
  const theme = useThemeStore((s) => s.current);
  const [showNewAgent, setShowNewAgent] = useState(false);

  useNotifications();

  useEffect(() => {
    init();
  }, [init]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.metaKey && e.key === "n") {
        e.preventDefault();
        setShowNewAgent(true);
        return;
      }

      if (e.metaKey && e.key >= "1" && e.key <= "9") {
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
    },
    [agents, selectAgent]
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
      <ToastContainer />
    </div>
  );
}
