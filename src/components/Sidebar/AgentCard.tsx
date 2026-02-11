import { useState, useRef, useEffect } from "react";
import { Folder, Trash2, Pin, Copy, Archive } from "lucide-react";
import type { Agent } from "../../types/agent";
import { STATUS_COLORS, STATUS_LABELS } from "../../lib/constants";
import { useAgentStore } from "../../store/agentStore";
import { useSidebarStore } from "../../store/sidebarStore";
import { useThemeStore } from "../../store/themeStore";
import { getDisplayName } from "../../lib/sortAgents";

interface Props {
  agent: Agent;
  selected: boolean;
  needsAttention?: boolean;
  isArchived?: boolean;
  isDragging?: boolean;
  isDragOver?: boolean;
  onPointerDown?: (e: React.PointerEvent) => void;
  didDragRef?: React.RefObject<boolean>;
}

export function AgentCard({
  agent,
  selected,
  needsAttention,
  isArchived,
  isDragging,
  isDragOver,
  onPointerDown,
  didDragRef,
}: Props) {
  const selectAgent = useAgentStore((s) => s.selectAgent);
  const removeAgent = useAgentStore((s) => s.removeAgent);
  const createAgent = useAgentStore((s) => s.createAgent);
  const prefs = useSidebarStore((s) => s.getPrefs(agent.id));
  const togglePin = useSidebarStore((s) => s.togglePin);
  const toggleArchive = useSidebarStore((s) => s.toggleArchive);
  const setDisplayName = useSidebarStore((s) => s.setDisplayName);
  const theme = useThemeStore((s) => s.current);

  const [hovered, setHovered] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const statusColor = STATUS_COLORS[agent.status] || "#B8B8B8";
  const statusLabel = STATUS_LABELS[agent.status] || agent.status;
  const dirName = agent.config.cwd.split("/").pop() || agent.config.cwd;
  const isWorking = agent.status === "working";
  const displayName = getDisplayName(agent, prefs);

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

  const handleDuplicate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const newName = displayName + " (copy)";
    await createAgent(newName, agent.config.cwd, agent.config.model, agent.config.permission_mode);
  };

  const attentionColor = needsAttention
    ? agent.status === "errored" ? theme.peach : theme.mint
    : undefined;

  return (
    <div
      data-agent-id={agent.id}
      onClick={() => {
        if (didDragRef?.current) return;
        selectAgent(agent.id);
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onPointerDown={!isArchived ? onPointerDown : undefined}
      style={{
        padding: "10px 12px",
        cursor: isDragging ? "grabbing" : "pointer",
        WebkitUserSelect: "none",
        userSelect: "none",
        borderRadius: 8,
        background: selected
          ? theme.lavenderLight
          : hovered
            ? "rgba(196, 181, 212, 0.1)"
            : "transparent",
        borderLeft: selected ? `3px solid ${theme.lavender}` : "3px solid transparent",
        borderTop: isDragOver ? `2px solid ${theme.lavender}` : "2px solid transparent",
        boxShadow: selected ? theme.shadowChunky : undefined,
        transition: isDragging ? "opacity 0.15s" : `all 0.2s ${theme.easeSpring}`,
        transform: hovered && !selected && !isDragging ? "scale(1.02)" : "scale(1)",
        opacity: isDragging ? 0.4 : isArchived ? 0.4 : agent.status === "exited" ? 0.5 : 1,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1 }}>
          {prefs.pinned && (
            <Pin
              size={10}
              color={theme.lavender}
              style={{ flexShrink: 0, transform: "rotate(45deg)" }}
            />
          )}
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: statusColor,
              flexShrink: 0,
              boxShadow: needsAttention
                ? `0 0 0 2px ${attentionColor}, 0 0 8px ${attentionColor}`
                : isWorking
                  ? `0 0 6px ${statusColor}`
                  : undefined,
              animation: needsAttention
                ? "pulse 1.5s infinite"
                : isWorking
                  ? "pulse 2s infinite"
                  : undefined,
            }}
          />
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
                fontSize: 13,
                color: theme.textPrimary,
                background: theme.bgCard,
                border: `1px solid ${theme.lavender}`,
                borderRadius: 4,
                padding: "1px 4px",
                outline: "none",
                width: "100%",
                minWidth: 0,
                fontFamily: theme.fontHeading,
              }}
            />
          ) : (
            <span
              onDoubleClick={(e) => {
                e.stopPropagation();
                startRename();
              }}
              style={{
                fontWeight: 600,
                fontSize: 13,
                color: theme.textPrimary,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontFamily: theme.fontHeading,
              }}
            >
              {displayName}
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
          {hovered && !isDragging && (
            <>
              <IconBtn
                title={prefs.pinned ? "Unpin" : "Pin to top"}
                onClick={(e) => { e.stopPropagation(); togglePin(agent.id); }}
                hoverColor={theme.lavender}
                active={prefs.pinned}
                theme={theme}
              >
                <Pin size={12} style={prefs.pinned ? { transform: "rotate(45deg)" } : undefined} />
              </IconBtn>
              <IconBtn
                title="Duplicate agent"
                onClick={handleDuplicate}
                hoverColor={theme.mint}
                theme={theme}
              >
                <Copy size={12} />
              </IconBtn>
              <IconBtn
                title={prefs.archived ? "Unarchive" : "Archive"}
                onClick={(e) => { e.stopPropagation(); toggleArchive(agent.id); }}
                hoverColor={theme.butter}
                active={prefs.archived}
                theme={theme}
              >
                <Archive size={12} />
              </IconBtn>
              <IconBtn
                title="Remove agent"
                onClick={(e) => { e.stopPropagation(); removeAgent(agent.id); }}
                hoverColor={theme.peach}
                theme={theme}
              >
                <Trash2 size={12} />
              </IconBtn>
            </>
          )}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4, paddingLeft: prefs.pinned ? 26 : 16 }}>
        <Folder size={11} color={theme.textMuted} />
        <span style={{ fontSize: 11, color: theme.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {dirName}
        </span>
      </div>
      <div style={{ marginTop: 3, paddingLeft: prefs.pinned ? 26 : 16 }}>
        <span style={{ fontSize: 10, color: theme.textSecondary }}>{statusLabel}</span>
      </div>
    </div>
  );
}

function IconBtn({
  children,
  title,
  onClick,
  hoverColor,
  active,
  theme,
}: {
  children: React.ReactNode;
  title: string;
  onClick: (e: React.MouseEvent) => void;
  hoverColor: string;
  active?: boolean;
  theme: import("../../lib/theme").ThemeColors;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        color: active ? hoverColor : theme.textMuted,
        padding: 3,
        display: "flex",
        borderRadius: 4,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.color = hoverColor)}
      onMouseLeave={(e) => (e.currentTarget.style.color = active ? hoverColor : theme.textMuted)}
    >
      {children}
    </button>
  );
}
