import { useEffect, useState, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { AlertTriangle, PanelLeftClose, PanelLeft } from "lucide-react";
import { useAgentStore } from "../store/agentStore";
import { useSidebarStore } from "../store/sidebarStore";
import { useThemeStore } from "../store/themeStore";
import { useAutomationsStore } from "../store/automationsStore";
import { sortAgents } from "../lib/sortAgents";
import { useNotifications } from "../hooks/useNotifications";
import type { EngineInfo } from "../types/agent";
import { Sidebar } from "./Sidebar/Sidebar";
import { MainPanel } from "./MainPanel/MainPanel";
import { NewAgentDialog } from "./NewAgentDialog";
import { ShortcutsDialog } from "./ShortcutsDialog";
import { OnboardingDialog } from "./OnboardingDialog";
import { ToastContainer } from "./ui/ToastContainer";

export function Layout() {
  const init = useAgentStore((s) => s.init);
  const agents = useAgentStore((s) => s.agents);
  const selectAgent = useAgentStore((s) => s.selectAgent);
  const theme = useThemeStore((s) => s.current);
  const sidebarWidth = useSidebarStore((s) => s.sidebarWidth);
  const collapsed = useSidebarStore((s) => s.collapsed);
  const toggleCollapsed = useSidebarStore((s) => s.toggleCollapsed);
  const setSidebarWidth = useSidebarStore((s) => s.setSidebarWidth);

  const [showNewAgent, setShowNewAgent] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [hasSupportedEngine, setHasSupportedEngine] = useState<boolean | null>(
    null,
  );
  const [resizing, setResizing] = useState(false);
  const resizeStart = useRef<{ x: number; w: number } | null>(null);

  useNotifications();

  useEffect(() => {
    init();
    useAutomationsStore.getState().initListener();

    // Check if any supported CLI is installed
    invoke<EngineInfo[]>("detect_engines")
      .then((engines) => {
        setHasSupportedEngine(
          engines.some(
            (engine) => engine.engine === "claude" && engine.available,
          ),
        );
      })
      .catch(() => setHasSupportedEngine(false));
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
                sidebarState.manualOrder,
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
              useAgentStore.setState({ pendingAction: "git" });
            }
            return;
          case "r": // Open Run dialog
            if (useAgentStore.getState().selectedAgentId) {
              e.preventDefault();
              useAgentStore.setState({ pendingAction: "run" });
            }
            return;
          case "e": // Open Terminal menu
            if (useAgentStore.getState().selectedAgentId) {
              e.preventDefault();
              useAgentStore.setState({ pendingAction: "terminal" });
            }
            return;
          case "p": // Toggle skills view
            e.preventDefault();
            {
              const store = useAgentStore.getState();
              store.setViewMode(
                store.viewMode === "skills" ? "agents" : "skills",
              );
            }
            return;
          case "a": // Toggle automations view
            e.preventDefault();
            {
              const store = useAgentStore.getState();
              store.setViewMode(
                store.viewMode === "automations" ? "agents" : "automations",
              );
            }
            return;
          case "m": // Toggle MCP view
            e.preventDefault();
            {
              const store = useAgentStore.getState();
              store.setViewMode(store.viewMode === "mcp" ? "agents" : "mcp");
            }
            return;
          case "h": // Toggle Hooks view
            e.preventDefault();
            {
              const store = useAgentStore.getState();
              store.setViewMode(
                store.viewMode === "hooks" ? "agents" : "hooks",
              );
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
                sidebarState.manualOrder,
              );
              if (visible.length === 0) return;
              const currentId = useAgentStore.getState().selectedAgentId;
              const idx = visible.findIndex((a) => a.id === currentId);
              const next = idx < 0 || idx >= visible.length - 1 ? 0 : idx + 1;
              selectAgent(visible[next].id);
            }
            return;
          case ".": // Agent config (Cmd+.)
            if (useAgentStore.getState().selectedAgentId) {
              e.preventDefault();
              useAgentStore.setState({ pendingAction: "config" });
            }
            return;
          case "b": // Toggle sidebar
            e.preventDefault();
            useSidebarStore.getState().toggleCollapsed();
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
            sidebarState.manualOrder,
          );
          if (idx < visibleAgents.length) {
            selectAgent(visibleAgents[idx].id);
          }
          return;
        }
      }
    },
    [agents, selectAgent, showShortcuts],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Show onboarding on first launch (no agents + never dismissed)
  const initialized = useAgentStore((s) => s.initialized);
  const agentCount = Object.keys(agents).length;
  useEffect(() => {
    if (
      initialized &&
      agentCount === 0 &&
      !localStorage.getItem("chorus-onboarded")
    ) {
      setShowOnboarding(true);
    }
  }, [initialized, agentCount]);

  // Sidebar resize drag
  const handleResizePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      resizeStart.current = { x: e.clientX, w: sidebarWidth };
      setResizing(true);
      const onMove = (ev: PointerEvent) => {
        if (!resizeStart.current) return;
        const delta = ev.clientX - resizeStart.current.x;
        setSidebarWidth(resizeStart.current.w + delta);
      };
      const onUp = () => {
        resizeStart.current = null;
        setResizing(false);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [sidebarWidth, setSidebarWidth],
  );

  const COLLAPSED_WIDTH = 48;

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: theme.bgBase,
        color: theme.textPrimary,
        fontFamily: theme.fontBody,
        overflow: "hidden",
        transition: "background-color 0.3s ease, color 0.3s ease",
      }}
    >
      {/* No supported CLI detected */}
      {hasSupportedEngine === false && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 20px",
            background: theme.gold + "20",
            borderBottom: `2px solid ${theme.gold}40`,
            fontSize: 12,
            fontWeight: 600,
            fontFamily: theme.fontBody,
            color: theme.gold,
            flexShrink: 0,
          }}
        >
          <AlertTriangle size={14} />
          <span>
            No Claude Code CLI found. Install Claude Code to get started:
          </span>
          <code
            style={{
              fontSize: 11,
              fontFamily: theme.fontCode,
              background: theme.bgBase,
              padding: "2px 8px",
              borderRadius: theme.borderRadiusSm,
              border: `1px solid ${theme.gold}40`,
            }}
          >
            npm install -g @anthropic-ai/claude-code
          </code>
          <button
            onClick={() => setHasSupportedEngine(null)}
            style={{
              marginLeft: "auto",
              background: "none",
              border: "none",
              color: theme.gold,
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 700,
              opacity: 0.7,
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "row",
          overflow: "hidden",
          cursor: resizing ? "col-resize" : undefined,
        }}
      >
        {collapsed ? (
          <div
            style={{
              width: COLLAPSED_WIDTH,
              minWidth: COLLAPSED_WIDTH,
              height: "100%",
              background: theme.bgSidebar,
              borderRight: `2px solid ${theme.borderColor}`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              paddingTop: 10,
              gap: 8,
            }}
          >
            <button
              onClick={toggleCollapsed}
              title="Expand sidebar"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: theme.textMuted,
                padding: 8,
                borderRadius: theme.borderRadiusSm,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <PanelLeft size={18} />
            </button>
          </div>
        ) : (
          <>
            <div
              style={{
                width: sidebarWidth,
                minWidth: sidebarWidth,
                flexShrink: 0,
                height: "100%",
                overflow: "hidden",
              }}
            >
              <Sidebar
                onNewAgent={() => setShowNewAgent(true)}
                onCollapse={toggleCollapsed}
              />
            </div>
            {/* Resize handle */}
            <div
              onPointerDown={handleResizePointerDown}
              style={{
                width: 6,
                cursor: "col-resize",
                background: resizing ? theme.pink + "40" : "transparent",
                transition: "background 0.15s ease",
                flexShrink: 0,
                zIndex: 10,
                marginLeft: -3,
                marginRight: -3,
              }}
              onMouseEnter={(e) => {
                if (!resizing)
                  (e.currentTarget as HTMLDivElement).style.background =
                    theme.borderColor;
              }}
              onMouseLeave={(e) => {
                if (!resizing)
                  (e.currentTarget as HTMLDivElement).style.background =
                    "transparent";
              }}
            />
          </>
        )}
        <div
          style={{
            flex: 1,
            height: "100%",
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <MainPanel />
        </div>
      </div>

      {showNewAgent && (
        <NewAgentDialog onClose={() => setShowNewAgent(false)} />
      )}
      {showShortcuts && (
        <ShortcutsDialog onClose={() => setShowShortcuts(false)} />
      )}
      {showOnboarding && (
        <OnboardingDialog
          onClose={() => setShowOnboarding(false)}
          onNewAgent={() => {
            setShowOnboarding(false);
            setShowNewAgent(true);
          }}
        />
      )}
      <ToastContainer />
    </div>
  );
}
