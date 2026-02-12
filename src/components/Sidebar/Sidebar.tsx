import { useState, useEffect, useRef, useCallback } from "react";
import { Sun, Moon, Plus, Search } from "lucide-react";
import { useAgentStore } from "../../store/agentStore";
import { useSidebarStore, type StatusFilter } from "../../store/sidebarStore";
import { useThemeStore } from "../../store/themeStore";
import { sortAgents, getDisplayName } from "../../lib/sortAgents";
import { IconButton } from "../ui/IconButton";
import { Button } from "../ui/Button";
import { AgentCard } from "./AgentCard";

const DRAG_THRESHOLD = 5;

const FILTERS: { label: string; value: StatusFilter }[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Attention", value: "attention" },
];

interface Props {
  onNewAgent: () => void;
}

export function Sidebar({ onNewAgent }: Props) {
  const agents = useAgentStore((s) => s.agents);
  const selectedAgentId = useAgentStore((s) => s.selectedAgentId);
  const attentionSet = useAgentStore((s) => s.attentionSet);

  const getPrefs = useSidebarStore((s) => s.getPrefs);
  const searchQuery = useSidebarStore((s) => s.searchQuery);
  const setSearchQuery = useSidebarStore((s) => s.setSearchQuery);
  const statusFilter = useSidebarStore((s) => s.statusFilter);
  const setStatusFilter = useSidebarStore((s) => s.setStatusFilter);
  const manualOrder = useSidebarStore((s) => s.manualOrder);
  const moveAgent = useSidebarStore((s) => s.moveAgent);
  const setManualOrder = useSidebarStore((s) => s.setManualOrder);

  const theme = useThemeStore((s) => s.current);
  const themeMode = useThemeStore((s) => s.mode);
  const toggleTheme = useThemeStore((s) => s.toggle);

  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const pointerDown = useRef<{ id: string; y: number } | null>(null);
  const draggingRef = useRef(false);
  const dragOverRef = useRef<string | null>(null);
  const didDragRef = useRef(false);
  const cardRects = useRef<Map<string, DOMRect>>(new Map());
  const listRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const allAgents = Object.values(agents);

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
    allAgents.filter((a) => matchesSearch(a) && matchesStatus(a) && !getPrefs(a.id).archived),
    getPrefs,
    manualOrder
  );

  // Keep manual order in sync
  useEffect(() => {
    const ids = filteredActive.map((a) => a.id);
    const currentOrder = useSidebarStore.getState().manualOrder;
    const missing = ids.filter((id) => !currentOrder.includes(id));
    if (missing.length > 0) {
      setManualOrder([...currentOrder, ...missing]);
    }
  }, [filteredActive.length, setManualOrder]);

  // Auto-scroll selected card into view
  useEffect(() => {
    if (selectedAgentId && listRef.current) {
      const selectedEl = listRef.current.querySelector(
        `[data-agent-id="${selectedAgentId}"]`
      ) as HTMLElement | null;
      if (selectedEl) {
        selectedEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }, [selectedAgentId]);

  const snapshotRects = useCallback(() => {
    cardRects.current.clear();
    if (!listRef.current) return;
    const cards = listRef.current.querySelectorAll<HTMLElement>("[data-agent-id]");
    cards.forEach((card) => {
      const id = card.dataset.agentId!;
      cardRects.current.set(id, card.getBoundingClientRect());
    });
  }, []);

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
    <div
      style={{
        width: 260,
        minWidth: 260,
        height: "100vh",
        background: theme.bgSidebar,
        borderRight: `2px solid ${theme.borderColor}`,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header — drag region with branding + theme toggle */}
      <div
        data-tauri-drag-region
        style={{
          padding: "10px 14px 10px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "relative",
          userSelect: "none",
          WebkitUserSelect: "none",
          minHeight: 52,
        }}
      >
        {/* Decorative bottom border */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 3,
            background: theme.accentGradient,
            opacity: 0.7,
          }}
        />

        {/* Left: branding cluster */}
        <div
          data-tauri-drag-region
          style={{ display: "flex", alignItems: "center", gap: 10 }}
        >
          <img
            data-tauri-drag-region
            src="/favicon.svg"
            alt=""
            width={22}
            height={22}
            style={{
              borderRadius: 6,
              filter: "drop-shadow(1px 1px 0px rgba(0,0,0,0.12))",
            }}
          />
          <div
            data-tauri-drag-region
            style={{ display: "flex", flexDirection: "column", gap: 0 }}
          >
            <span
              data-tauri-drag-region
              style={{
                fontSize: 16,
                fontWeight: 800,
                letterSpacing: "-0.03em",
                fontFamily: theme.fontHeading,
                background: theme.accentGradient,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                lineHeight: 1.15,
              }}
            >
              Chorus
            </span>
            <span
              data-tauri-drag-region
              style={{
                fontSize: 9,
                color: theme.textMuted,
                letterSpacing: "0.06em",
                fontFamily: theme.fontBody,
                fontWeight: 600,
                lineHeight: 1,
                marginTop: 1,
              }}
            >
              many voices, one stage
            </span>
          </div>
        </div>

        {/* Right: theme toggle */}
        <IconButton
          icon={
            themeMode === "light" ? (
              <Moon size={15} strokeWidth={2.2} />
            ) : (
              <Sun size={15} strokeWidth={2.2} />
            )
          }
          tooltip={themeMode === "light" ? "Cozy dark mode" : "Sunny light mode"}
          onClick={toggleTheme}
          hoverColor={themeMode === "light" ? theme.lavender : theme.gold}
          style={{ borderRadius: theme.borderRadiusSm }}
        />
      </div>

      {/* Search & Filters */}
      <div style={{ padding: "12px 12px 8px", display: "flex", flexDirection: "column", gap: 8 }}>
        {/* Search input */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: theme.bgBase,
            borderRadius: theme.borderRadiusSm,
            padding: "7px 10px",
            border: `2px solid ${theme.borderStrong}`,
            boxShadow: theme.shadowPress,
          }}
        >
          <Search
            size={13}
            color={theme.textMuted}
            strokeWidth={2.2}
            style={{ flexShrink: 0 }}
          />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search agents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: "transparent",
              border: "none",
              outline: "none",
              color: theme.textPrimary,
              fontSize: 12,
              width: "100%",
              fontFamily: theme.fontBody,
              fontWeight: 500,
            }}
          />
        </div>

        {/* Filter pills */}
        <div style={{ display: "flex", gap: 5 }}>
          {FILTERS.map((f) => {
            const isActive = statusFilter === f.value;
            return (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                style={{
                  flex: 1,
                  padding: "5px 0",
                  background: isActive ? theme.pinkLight : theme.bgCard,
                  border: isActive
                    ? `2px solid ${theme.pink}`
                    : `2px solid ${theme.borderColor}`,
                  borderRadius: theme.borderRadiusFull,
                  color: isActive ? theme.textPrimary : theme.textSecondary,
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: theme.fontHeading,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  transform: isActive ? "scale(1.04)" : "scale(1)",
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Agent list */}
      <div
        ref={listRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "4px 8px",
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        {filteredActive.length === 0 ? (
          <div
            style={{
              padding: "24px 12px",
              textAlign: "center",
              fontSize: 13,
              color: theme.textMuted,
              fontFamily: theme.fontBody,
              fontWeight: 600,
              letterSpacing: "-0.01em",
            }}
          >
            {searchQuery || statusFilter !== "all"
              ? "No matching agents found ~"
              : "\u2728 No agents yet"}
          </div>
        ) : (
          filteredActive.map((agent, i) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              selected={selectedAgentId === agent.id}
              index={i}
              needsAttention={!!attentionSet[agent.id]}
              isDragging={dragId === agent.id}
              isDragOver={dragOverId === agent.id}
              onPointerDown={(e) => handlePointerDown(agent.id, e)}
              didDragRef={didDragRef}
            />
          ))
        )}
      </div>

      {/* Footer — New Agent button */}
      <div style={{ padding: "8px 12px 12px" }}>
        <Button
          variant="primary"
          size="sm"
          onClick={onNewAgent}
          icon={<Plus size={14} strokeWidth={2.5} />}
          style={{
            width: "100%",
            justifyContent: "center",
            padding: "8px 0",
            fontSize: 13,
            fontWeight: 700,
            borderRadius: theme.borderRadiusSm,
            fontFamily: theme.fontHeading,
            letterSpacing: "-0.01em",
            gap: 6,
          }}
        >
          New Agent
        </Button>
      </div>
    </div>
  );
}
