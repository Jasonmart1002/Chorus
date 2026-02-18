import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Sun, Moon, Plus, Search, Zap, SkipForward, Folder, MessageSquare, CheckCircle2 } from "lucide-react";
import { useAgentStore } from "../../store/agentStore";
import { useSidebarStore, type StatusFilter } from "../../store/sidebarStore";
import { useThemeStore } from "../../store/themeStore";
import { sortAgents, getDisplayName } from "../../lib/sortAgents";
import { getStatusColors, STATUS_LABELS } from "../../lib/constants";
import { PASTEL_KEYS } from "../../lib/theme";
import { IconButton } from "../ui/IconButton";
import { Button } from "../ui/Button";
import { AgentCard } from "./AgentCard";
import type { SDKMessage } from "../../types/messages";

const DRAG_THRESHOLD = 5;

const FILTERS: { label: string; value: StatusFilter }[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Attention", value: "attention" },
];

/** Sidebar content shown during vibe mode — focused current agent + queue */
function VibeSidebarContent() {
  const agents = useAgentStore((s) => s.agents);
  const vibeCurrentId = useAgentStore((s) => s.vibeCurrentId);
  const attentionSet = useAgentStore((s) => s.attentionSet);
  const attentionTimestamps = useAgentStore((s) => s.attentionTimestamps);
  const vibeSkip = useAgentStore((s) => s.vibeSkip);
  const getPrefs = useSidebarStore((s) => s.getPrefs);
  const theme = useThemeStore((s) => s.current);

  const messages = useAgentStore((s) => vibeCurrentId ? s.messages[vibeCurrentId] : undefined);
  const currentAgent = vibeCurrentId ? agents[vibeCurrentId] : null;
  const statusColors = getStatusColors(theme);

  // Last interaction summary for current agent
  const lastInteraction = useMemo(() => {
    if (!messages || messages.length === 0) return null;
    let lastPrompt: string | null = null;
    let lastResult: string | null = null;
    // Walk backwards to find the most recent of each
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg: SDKMessage = messages[i];
      if (!lastResult && msg.type === "result") {
        lastResult = msg.result;
      }
      if (!lastPrompt && msg.type === "user_prompt") {
        lastPrompt = msg.text;
      }
      if (lastPrompt && lastResult) break;
    }
    if (!lastPrompt && !lastResult) return null;
    return { lastPrompt, lastResult };
  }, [messages]);

  // Queue: attention agents sorted by timestamp (FIFO), excluding current
  const queueIds = Object.keys(attentionSet)
    .filter((id) => id !== vibeCurrentId)
    .sort((a, b) => (attentionTimestamps[a] || 0) - (attentionTimestamps[b] || 0));

  // All active agents for the count
  const activeAgents = Object.values(agents).filter((a) => a.status !== "exited");
  const allAgentIds = Object.keys(agents);

  // Pastel for current agent
  const currentIndex = vibeCurrentId ? allAgentIds.indexOf(vibeCurrentId) : 0;
  const pastelKey = PASTEL_KEYS[Math.max(0, currentIndex) % PASTEL_KEYS.length];
  const pastelColor = theme[pastelKey];

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Current agent spotlight */}
      <div style={{ padding: "16px 14px 12px", display: "flex", flexDirection: "column", gap: 12 }}>
        {currentAgent ? (
          <>
            {/* Agent card — large, featured */}
            <div
              key={vibeCurrentId}
              style={{
                background: pastelColor,
                border: `2.5px solid ${theme.borderStrong}`,
                borderRadius: theme.borderRadiusSm,
                boxShadow: theme.shadowChunky,
                padding: "14px 14px 12px",
                display: "flex",
                flexDirection: "column",
                gap: 8,
                animation: "springIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
              }}
            >
              {/* Status badge */}
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: statusColors[currentAgent.status] || theme.textMuted,
                    display: "inline-block",
                    boxShadow: `0 0 6px 2px ${(statusColors[currentAgent.status] || theme.textMuted)}55`,
                    animation: currentAgent.status === "awaiting_input" ? "pulse 1.5s infinite" : undefined,
                  }}
                />
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    fontFamily: theme.fontHeading,
                    color: statusColors[currentAgent.status] || theme.textSecondary,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  {STATUS_LABELS[currentAgent.status] || currentAgent.status}
                </span>
              </div>

              {/* Agent name — large */}
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  fontFamily: theme.fontHeading,
                  color: theme.textPrimary,
                  letterSpacing: "-0.03em",
                  lineHeight: 1.2,
                  wordBreak: "break-word",
                }}
              >
                {getDisplayName(currentAgent, getPrefs(currentAgent.id))}
              </div>

              {/* CWD */}
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <Folder size={11} color={theme.textMuted} strokeWidth={2} style={{ flexShrink: 0 }} />
                <span
                  style={{
                    fontSize: 11,
                    color: theme.textMuted,
                    fontFamily: theme.fontCode,
                    fontWeight: 500,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {currentAgent.config.cwd.split("/").filter(Boolean).pop() || currentAgent.config.cwd}
                </span>
              </div>
            </div>

            {/* Skip button */}
            {queueIds.length > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={vibeSkip}
                icon={<SkipForward size={13} strokeWidth={2.5} />}
                style={{
                  width: "100%",
                  justifyContent: "center",
                  padding: "7px 0",
                  fontSize: 12,
                  fontWeight: 700,
                  borderRadius: theme.borderRadiusSm,
                  fontFamily: theme.fontHeading,
                  letterSpacing: "-0.01em",
                  gap: 6,
                }}
              >
                Skip
              </Button>
            )}
          </>
        ) : (
          /* No current agent — all working */
          <div
            style={{
              padding: "20px 8px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: theme.borderRadiusSm,
                background: theme.accentGradient,
                opacity: 0.15,
                filter: "blur(12px)",
                position: "absolute",
              }}
            />
            <Zap size={20} color={theme.textMuted} strokeWidth={2} />
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                fontFamily: theme.fontHeading,
                color: theme.textSecondary,
              }}
            >
              All voices performing
            </span>
            <span
              style={{
                fontSize: 11,
                fontFamily: theme.fontBody,
                color: theme.textMuted,
                fontWeight: 500,
              }}
            >
              {activeAgents.length} agent{activeAgents.length !== 1 ? "s" : ""} working
            </span>
          </div>
        )}
      </div>

      {/* Queue list — up next */}
      {queueIds.length > 0 && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div
            style={{
              padding: "0 14px 6px",
              fontSize: 10,
              fontWeight: 700,
              fontFamily: theme.fontHeading,
              color: theme.textMuted,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Up next
          </div>
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "0 10px 8px",
              display: "flex",
              flexDirection: "column",
              gap: 3,
            }}
          >
            {queueIds.map((id, i) => {
              const agent = agents[id];
              if (!agent) return null;
              const idx = allAgentIds.indexOf(id);
              const qPastel = theme[PASTEL_KEYS[Math.max(0, idx) % PASTEL_KEYS.length]];
              return (
                <div
                  key={id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 8px",
                    borderRadius: theme.borderRadiusSm,
                    background: `${qPastel}33`,
                    border: `1.5px solid ${theme.borderColor}`,
                    animation: `fadeIn 0.2s ease ${i * 0.05}s backwards`,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: statusColors[agent.status] || theme.textMuted,
                      flexShrink: 0,
                      boxShadow: `0 0 4px 1px ${(statusColors[agent.status] || theme.textMuted)}44`,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      fontFamily: theme.fontBody,
                      color: theme.textPrimary,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    {getDisplayName(agent, getPrefs(agent.id))}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Last interaction summary — pinned to bottom */}
      {currentAgent && lastInteraction && (
        <div
          style={{
            marginTop: "auto",
            padding: "8px 12px 12px",
            borderTop: `1.5px solid ${theme.borderColor}`,
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              fontFamily: theme.fontHeading,
              color: theme.textMuted,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Last interaction
          </span>

          {lastInteraction.lastPrompt && (
            <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
              <MessageSquare
                size={11}
                color={theme.pink}
                strokeWidth={2.2}
                style={{ flexShrink: 0, marginTop: 2 }}
              />
              <span
                style={{
                  fontSize: 11,
                  fontFamily: theme.fontBody,
                  color: theme.textSecondary,
                  fontWeight: 600,
                  lineHeight: 1.35,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {lastInteraction.lastPrompt}
              </span>
            </div>
          )}

          {lastInteraction.lastResult && (
            <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
              <CheckCircle2
                size={11}
                color={theme.mint}
                strokeWidth={2.2}
                style={{ flexShrink: 0, marginTop: 2 }}
              />
              <span
                style={{
                  fontSize: 11,
                  fontFamily: theme.fontBody,
                  color: theme.textMuted,
                  fontWeight: 500,
                  lineHeight: 1.35,
                  display: "-webkit-box",
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {lastInteraction.lastResult}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

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

  const focusSearchCounter = useSidebarStore((s) => s.focusSearchCounter);

  const vibeMode = useAgentStore((s) => s.vibeMode);
  const toggleVibeMode = useAgentStore((s) => s.toggleVibeMode);

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

  // Focus search input when triggered by global shortcut (Cmd+F)
  useEffect(() => {
    if (focusSearchCounter > 0) {
      searchInputRef.current?.focus();
    }
  }, [focusSearchCounter]);

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

        {/* Right: vibe mode toggle + theme toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <IconButton
            icon={<Zap size={14} strokeWidth={2.2} />}
            tooltip={vibeMode ? "Exit Vibe Mode" : "Enter Vibe Mode"}
            onClick={toggleVibeMode}
            style={
              vibeMode
                ? {
                    background: theme.accentGradient,
                    color: theme.textOnAccent,
                    border: `2px solid ${theme.borderStrong}`,
                    boxShadow: theme.shadowChunky,
                    borderRadius: theme.borderRadiusSm,
                  }
                : { borderRadius: theme.borderRadiusSm }
            }
            hoverColor={theme.gold}
          />
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
      </div>

      {vibeMode ? (
        <VibeSidebarContent />
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}
