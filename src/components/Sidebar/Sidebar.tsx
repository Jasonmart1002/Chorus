import { useState, useEffect, useRef, useCallback } from "react";
import { Archive, Sun, Moon } from "lucide-react";
import { useAgentStore } from "../../store/agentStore";
import { useSidebarStore } from "../../store/sidebarStore";
import { useThemeStore } from "../../store/themeStore";
import { sortAgents, getDisplayName } from "../../lib/sortAgents";
import { AgentCard } from "./AgentCard";
import { SidebarFilters } from "./SidebarFilters";
import { NewAgentButton } from "./NewAgentButton";
import { NewAgentDialog } from "../NewAgentDialog";

const DRAG_THRESHOLD = 5;

export function Sidebar() {
  const agents = useAgentStore((s) => s.agents);
  const selectedAgentId = useAgentStore((s) => s.selectedAgentId);
  const attentionSet = useAgentStore((s) => s.attentionSet);

  const getPrefs = useSidebarStore((s) => s.getPrefs);
  const searchQuery = useSidebarStore((s) => s.searchQuery);
  const statusFilter = useSidebarStore((s) => s.statusFilter);
  const showArchived = useSidebarStore((s) => s.showArchived);
  const setShowArchived = useSidebarStore((s) => s.setShowArchived);
  const manualOrder = useSidebarStore((s) => s.manualOrder);
  const moveAgent = useSidebarStore((s) => s.moveAgent);
  const setManualOrder = useSidebarStore((s) => s.setManualOrder);

  const theme = useThemeStore((s) => s.current);
  const themeMode = useThemeStore((s) => s.mode);
  const toggleTheme = useThemeStore((s) => s.toggle);

  const [showDialog, setShowDialog] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  // Pointer-based drag tracking (all refs to avoid stale closures)
  const pointerDown = useRef<{ id: string; y: number } | null>(null);
  const draggingRef = useRef(false);
  const dragOverRef = useRef<string | null>(null);
  const didDragRef = useRef(false); // stays true until next frame after pointerup
  const cardRects = useRef<Map<string, DOMRect>>(new Map());
  const listRef = useRef<HTMLDivElement>(null);

  const allAgents = Object.values(agents);
  const activeAgents = allAgents.filter((a) => !getPrefs(a.id).archived);
  const archivedAgents = allAgents.filter((a) => getPrefs(a.id).archived);

  const matchesSearch = (a: typeof allAgents[0]) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const name = getDisplayName(a, getPrefs(a.id)).toLowerCase();
    const cwd = a.config.cwd.toLowerCase();
    return name.includes(q) || cwd.includes(q);
  };

  const matchesStatus = (a: typeof allAgents[0]) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "active") return a.status !== "exited";
    if (statusFilter === "attention") return a.status === "awaiting_input" || a.status === "errored";
    return true;
  };

  const filteredActive = sortAgents(
    activeAgents.filter((a) => matchesSearch(a) && matchesStatus(a)),
    getPrefs,
    manualOrder
  );

  // Sync: ensure all agent IDs are in manualOrder
  useEffect(() => {
    const ids = filteredActive.map((a) => a.id);
    const currentOrder = useSidebarStore.getState().manualOrder;
    const missing = ids.filter((id) => !currentOrder.includes(id));
    if (missing.length > 0) {
      setManualOrder([...currentOrder, ...missing]);
    }
  }, [filteredActive.length, setManualOrder]);

  const filteredArchived = sortAgents(
    archivedAgents.filter((a) => matchesSearch(a)),
    getPrefs
  );

  const attentionCount = Object.keys(attentionSet).length;

  // Snapshot card positions when drag starts
  const snapshotRects = useCallback(() => {
    cardRects.current.clear();
    if (!listRef.current) return;
    const cards = listRef.current.querySelectorAll<HTMLElement>("[data-agent-id]");
    cards.forEach((card) => {
      const id = card.dataset.agentId!;
      cardRects.current.set(id, card.getBoundingClientRect());
    });
  }, []);

  // Find which card the pointer Y is over
  const findTargetId = useCallback((clientY: number): string | null => {
    for (const [id, rect] of cardRects.current) {
      if (clientY >= rect.top && clientY <= rect.bottom) {
        return id;
      }
    }
    return null;
  }, []);

  const handlePointerDown = useCallback((agentId: string, e: React.PointerEvent) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).tagName === "INPUT") return;
    if ((e.target as HTMLElement).closest("button")) return;
    pointerDown.current = { id: agentId, y: e.clientY };
    draggingRef.current = false;
  }, []);

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!pointerDown.current) return;

      const dy = Math.abs(e.clientY - pointerDown.current.y);
      if (!draggingRef.current && dy >= DRAG_THRESHOLD) {
        draggingRef.current = true;
        didDragRef.current = true;
        setDragId(pointerDown.current.id);
        snapshotRects();
      }

      if (draggingRef.current) {
        const targetId = findTargetId(e.clientY);
        const newOver = (targetId && targetId !== pointerDown.current.id) ? targetId : null;
        dragOverRef.current = newOver;
        setDragOverId(newOver);
      }
    };

    const handlePointerUp = () => {
      if (draggingRef.current && pointerDown.current && dragOverRef.current) {
        moveAgent(pointerDown.current.id, dragOverRef.current);
      }

      pointerDown.current = null;
      draggingRef.current = false;
      dragOverRef.current = null;
      setDragId(null);
      setDragOverId(null);

      // Keep didDragRef true through the click event, then reset
      requestAnimationFrame(() => {
        didDragRef.current = false;
      });
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [snapshotRects, findTargetId, moveAgent]);

  return (
    <>
      <div
        style={{
          width: 260,
          minWidth: 260,
          height: "100%",
          background: theme.bgSidebar,
          borderRight: `1px solid ${theme.borderColor}`,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          transition: "background-color 0.3s ease",
        }}
      >
        <div
          style={{
            padding: "16px 12px 12px",
            borderBottom: `1px solid ${theme.borderColor}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
          data-tauri-drag-region
        >
          <span style={{ fontSize: 14, fontWeight: 700, color: theme.textPrimary, letterSpacing: "-0.02em", fontFamily: theme.fontHeading }}>
            CC-Manager
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              onClick={toggleTheme}
              title={themeMode === "light" ? "Switch to dark mode" : "Switch to light mode"}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: theme.textMuted,
                padding: 3,
                display: "flex",
                borderRadius: 4,
                transition: "color 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = theme.lavender)}
              onMouseLeave={(e) => (e.currentTarget.style.color = theme.textMuted)}
            >
              {themeMode === "light" ? <Moon size={14} /> : <Sun size={14} />}
            </button>
            {attentionCount > 0 && (
              <span
                style={{
                  background: theme.peach,
                  color: "white",
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: 12,
                  fontFamily: theme.fontHeading,
                }}
              >
                {attentionCount} need attention
              </span>
            )}
          </div>
        </div>

        <SidebarFilters />

        <div
          ref={listRef}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "8px 8px",
            display: "flex",
            flexDirection: "column",
            gap: 2,
            userSelect: "none",
          }}
        >
          {filteredActive.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              selected={selectedAgentId === agent.id}
              needsAttention={!!attentionSet[agent.id]}
              isDragging={dragId === agent.id}
              isDragOver={dragOverId === agent.id}
              onPointerDown={(e) => handlePointerDown(agent.id, e)}
              didDragRef={didDragRef}
            />
          ))}

          {filteredActive.length === 0 && (
            <div style={{ padding: "16px 8px", textAlign: "center", color: theme.textMuted, fontSize: 12 }}>
              {searchQuery || statusFilter !== "all" ? "No matching agents" : "No agents yet"}
            </div>
          )}

          {archivedAgents.length > 0 && (
            <button
              onClick={() => setShowArchived(!showArchived)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: theme.textMuted,
                fontSize: 11,
                fontWeight: 600,
                padding: "8px 4px 4px",
                display: "flex",
                alignItems: "center",
                gap: 4,
                textAlign: "left",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = theme.textSecondary)}
              onMouseLeave={(e) => (e.currentTarget.style.color = theme.textMuted)}
            >
              <Archive size={11} />
              {showArchived ? "Hide" : "Show"} {archivedAgents.length} archived
            </button>
          )}

          {showArchived &&
            filteredArchived.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                selected={selectedAgentId === agent.id}
                needsAttention={!!attentionSet[agent.id]}
                isArchived
              />
            ))}
        </div>

        <div style={{ padding: "8px 8px 12px" }}>
          <NewAgentButton onClick={() => setShowDialog(true)} />
        </div>
      </div>

      {showDialog && <NewAgentDialog onClose={() => setShowDialog(false)} />}
    </>
  );
}
