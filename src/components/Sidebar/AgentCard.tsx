import { useState, useRef, useEffect } from "react";
import { X, Pin, Folder, Check } from "lucide-react";
import type { Agent } from "../../types/agent";
import { getStatusColors, STATUS_LABELS } from "../../lib/constants";
import { PASTEL_KEYS } from "../../lib/theme";
import { useAgentStore } from "../../store/agentStore";
import { useSidebarStore } from "../../store/sidebarStore";
import { useThemeStore } from "../../store/themeStore";
import { getDisplayName } from "../../lib/sortAgents";
import { basename } from "../../lib/platform";

interface Props {
  agent: Agent;
  selected: boolean;
  index: number;
  needsAttention?: boolean;
  isDragging?: boolean;
  isDragOver?: boolean;
  onPointerDown?: (e: React.PointerEvent) => void;
  didDragRef?: React.RefObject<boolean>;
}

export function AgentCard({
  agent,
  selected,
  index,
  needsAttention,
  isDragging,
  isDragOver,
  onPointerDown,
  didDragRef,
}: Props) {
  const selectAgent = useAgentStore((s) => s.selectAgent);
  const removeAgent = useAgentStore((s) => s.removeAgent);
  const prefs = useSidebarStore((s) => s.getPrefs(agent.id));
  const setDisplayName = useSidebarStore((s) => s.setDisplayName);
  const theme = useThemeStore((s) => s.current);

  const [hovered, setHovered] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [confirming, setConfirming] = useState(false);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const statusColor = getStatusColors(theme)[agent.status] || theme.textMuted;
  const displayName = getDisplayName(agent, prefs);
  const isWorking = agent.status === "working";
  const statusLabel = STATUS_LABELS[agent.status] || agent.status;

  // Rotating pastel background by index
  const pastelKey = PASTEL_KEYS[index % PASTEL_KEYS.length];
  const pastelColor = theme[pastelKey];

  // Extract dir name from cwd
  const dirName = basename(agent.config.cwd);

  // Reset confirming state when mouse leaves the card
  useEffect(() => {
    if (!hovered && confirming) {
      setConfirming(false);
    }
  }, [hovered, confirming]);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
    };
  }, []);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const startRename = () => {
    setEditValue(displayName);
    setEditing(true);
  };

  const commitRename = () => {
    setEditing(false);
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== agent.config.name) {
      setDisplayName(agent.id, trimmed);
    } else if (trimmed === agent.config.name) {
      setDisplayName(agent.id, null);
    }
  };

  const cancelRename = () => {
    setEditing(false);
  };

  const handleCloseClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirming) {
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
      setConfirming(false);
      removeAgent(agent.id);
    } else {
      setConfirming(true);
      confirmTimer.current = setTimeout(() => setConfirming(false), 2000);
    }
  };

  // Build background
  const bg = selected
    ? pastelColor
    : hovered
      ? `${pastelColor}44`
      : "transparent";

  // Build border
  const border = selected
    ? `2.5px solid ${theme.borderStrong}`
    : isDragOver
      ? `2.5px solid ${theme.pink}`
      : "2.5px solid transparent";

  // Shadow
  const shadow = selected
    ? theme.shadowChunky
    : hovered && !isDragging
      ? theme.shadowPress
      : "none";

  return (
    <div
      data-agent-id={agent.id}
      onClick={() => {
        if (didDragRef?.current) return;
        selectAgent(agent.id);
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onPointerDown={onPointerDown}
      onDoubleClick={(e) => {
        e.stopPropagation();
        startRename();
      }}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 3,
        padding: "7px 10px",
        borderRadius: theme.borderRadiusSm,
        cursor: isDragging ? "grabbing" : "pointer",
        userSelect: "none",
        WebkitUserSelect: "none",
        background: bg,
        border,
        boxShadow: shadow,
        opacity: isDragging ? 0.4 : agent.status === "exited" ? 0.5 : 1,
        transition: isDragging
          ? "opacity 0.15s, transform 0.15s"
          : `background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease`,
        position: "relative",
      }}
    >
      {/* Main row: pin + status dot + name + close */}
      <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
        {/* Pin indicator */}
        {prefs.pinned && (
          <Pin
            size={10}
            color={theme.pink}
            strokeWidth={2.5}
            style={{
              flexShrink: 0,
              transform: "rotate(45deg)",
              filter: `drop-shadow(0 0 2px ${theme.pink}55)`,
            }}
          />
        )}

        {/* Status dot */}
        <span
          style={{
            display: "inline-block",
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: statusColor,
            flexShrink: 0,
            border: `2px solid ${selected ? theme.bgCard : theme.bgBase}`,
            boxShadow: needsAttention
              ? `0 0 0 2px ${statusColor}, 0 0 8px ${statusColor}`
              : `0 0 0 1px ${statusColor}33`,
            animation: needsAttention || isWorking ? "pulse 1.5s infinite" : undefined,
            transition: "box-shadow 0.2s ease, border-color 0.2s ease",
          }}
        />

        {/* Name — editing or display */}
        {editing ? (
          <input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") cancelRename();
            }}
            onClick={(e) => e.stopPropagation()}
            style={{
              fontWeight: 600,
              fontSize: 12,
              color: theme.textPrimary,
              background: theme.bgSurface,
              border: `2px solid ${theme.pink}`,
              borderRadius: theme.borderRadiusSm,
              padding: "2px 6px",
              outline: "none",
              flex: 1,
              minWidth: 0,
              fontFamily: theme.fontBody,
            }}
          />
        ) : (
          <span
            style={{
              fontWeight: selected ? 700 : 600,
              fontSize: 12,
              color: theme.textPrimary,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontFamily: theme.fontBody,
              flex: 1,
              minWidth: 0,
              letterSpacing: "-0.01em",
            }}
          >
            {displayName}
          </span>
        )}

        {/* Close / confirm button */}
        {hovered && !editing && !isDragging && (
          <button
            onClick={handleCloseClick}
            style={{
              background: confirming ? theme.peach : theme.bgSurface,
              border: `1.5px solid ${confirming ? theme.peach : theme.borderColor}`,
              cursor: "pointer",
              color: confirming ? theme.textOnAccent : theme.textMuted,
              padding: 0,
              width: 18,
              height: 18,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              borderRadius: "50%",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              if (!confirming) {
                (e.currentTarget as HTMLButtonElement).style.background = theme.peachLight;
                (e.currentTarget as HTMLButtonElement).style.borderColor = theme.peach;
                (e.currentTarget as HTMLButtonElement).style.color = theme.peach;
              }
            }}
            onMouseLeave={(e) => {
              if (!confirming) {
                (e.currentTarget as HTMLButtonElement).style.background = theme.bgSurface;
                (e.currentTarget as HTMLButtonElement).style.borderColor = theme.borderColor;
                (e.currentTarget as HTMLButtonElement).style.color = theme.textMuted;
              }
            }}
          >
            {confirming ? (
              <Check size={10} strokeWidth={3} />
            ) : (
              <X size={10} strokeWidth={2.5} />
            )}
          </button>
        )}
      </div>

      {/* Sub row: folder + dir name + status label */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          paddingLeft: prefs.pinned ? 17 : 0,
          marginLeft: 17,
          minWidth: 0,
        }}
      >
        <Folder
          size={10}
          color={theme.textMuted}
          strokeWidth={2}
          style={{ flexShrink: 0 }}
        />
        <span
          style={{
            fontSize: 11,
            color: theme.textMuted,
            fontFamily: theme.fontBody,
            fontWeight: 500,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
            minWidth: 0,
          }}
        >
          {dirName}
        </span>
        <span
          style={{
            fontSize: 10,
            color: statusColor,
            fontFamily: theme.fontBody,
            fontWeight: 600,
            flexShrink: 0,
            letterSpacing: "0.02em",
          }}
        >
          {statusLabel}
        </span>
      </div>
    </div>
  );
}
