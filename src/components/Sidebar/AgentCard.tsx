import { useState, useRef, useEffect } from "react";
import { Folder, Trash2, Pin, Copy, Pencil } from "lucide-react";
import type { Agent } from "../../types/agent";
import { STATUS_COLORS, STATUS_LABELS } from "../../lib/constants";
import { useAgentStore } from "../../store/agentStore";
import { useSidebarStore } from "../../store/sidebarStore";
import { useThemeStore } from "../../store/themeStore";
import { getDisplayName } from "../../lib/sortAgents";
import { IconButton } from "../ui/IconButton";
import { Badge } from "../ui/Badge";
import { ConfirmDialog } from "../ui/ConfirmDialog";

interface Props {
  agent: Agent;
  selected: boolean;
  needsAttention?: boolean;
  isDragging?: boolean;
  isDragOver?: boolean;
  onPointerDown?: (e: React.PointerEvent) => void;
  didDragRef?: React.RefObject<boolean>;
}

export function AgentCard({
  agent,
  selected,
  needsAttention,
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
  const setDisplayName = useSidebarStore((s) => s.setDisplayName);
  const theme = useThemeStore((s) => s.current);

  const [hovered, setHovered] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const statusColor = STATUS_COLORS[agent.status] || theme.textMuted;
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
    <>
      <div
        data-agent-id={agent.id}
        onClick={() => {
          if (didDragRef?.current) return;
          selectAgent(agent.id);
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onPointerDown={onPointerDown}
        style={{
          padding: "8px 12px",
          cursor: isDragging ? "grabbing" : "pointer",
          WebkitUserSelect: "none",
          userSelect: "none",
          borderRadius: 8,
          background: selected
            ? theme.lavenderLight
            : hovered
              ? theme.hoverOverlay
              : needsAttention
                ? `${attentionColor}08`
                : "transparent",
          borderLeft: selected
            ? `3px solid ${theme.lavender}`
            : needsAttention
              ? `3px solid ${attentionColor}`
              : "3px solid transparent",
          borderTop: isDragOver ? `2px solid ${theme.lavender}` : "2px solid transparent",
          boxShadow: selected ? theme.shadowChunky : undefined,
          transition: isDragging ? "opacity 0.15s" : "background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease",
          opacity: isDragging ? 0.4 : agent.status === "exited" ? 0.5 : 1,
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
            <Badge
              variant="status"
              color={statusColor}
              glow={!!needsAttention}
              pulse={!!needsAttention || isWorking}
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
                  fontWeight: 500,
                  fontSize: 13,
                  color: theme.textPrimary,
                  background: theme.bgCard,
                  border: `1px solid ${theme.lavender}`,
                  borderRadius: 4,
                  padding: "1px 4px",
                  outline: "none",
                  width: "100%",
                  minWidth: 0,
                  fontFamily: theme.fontBody,
                }}
              />
            ) : (
              <span
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  startRename();
                }}
                style={{
                  fontWeight: 500,
                  fontSize: 13,
                  color: theme.textPrimary,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  fontFamily: theme.fontBody,
                }}
              >
                {displayName}
              </span>
            )}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              flexShrink: 0,
              opacity: hovered && !isDragging ? 1 : 0,
              pointerEvents: hovered && !isDragging ? "auto" : "none",
              transition: "opacity 0.1s ease",
            }}
          >
            <IconButton
              icon={<Pin size={14} style={prefs.pinned ? { transform: "rotate(45deg)" } : undefined} />}
              tooltip={prefs.pinned ? "Unpin" : "Pin to top"}
              onClick={(e) => { e.stopPropagation(); togglePin(agent.id); }}
              hoverColor={theme.lavender}
              active={prefs.pinned}
            />
            <IconButton
              icon={<Copy size={14} />}
              tooltip="Duplicate agent"
              onClick={handleDuplicate}
              hoverColor={theme.mint}
            />
            <IconButton
              icon={<Pencil size={14} />}
              tooltip="Rename"
              onClick={(e) => { e.stopPropagation(); startRename(); }}
              hoverColor={theme.butter}
            />
            <IconButton
              icon={<Trash2 size={14} />}
              tooltip="Remove agent"
              onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); }}
              hoverColor={theme.peach}
            />
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4, paddingLeft: prefs.pinned ? 26 : 16 }}>
          <Folder size={11} color={theme.textMuted} />
          <span style={{ fontSize: 11, color: theme.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {dirName}
          </span>
        </div>
        <div style={{ marginTop: 4, paddingLeft: prefs.pinned ? 26 : 16 }}>
          <span style={{ fontSize: 10, color: theme.textSecondary }}>{statusLabel}</span>
          {needsAttention && (
            <span style={{ fontSize: 10, fontWeight: 600, color: attentionColor, marginLeft: 6 }}>
              {agent.status === "errored" ? "Error" : "Needs input"}
            </span>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => removeAgent(agent.id)}
        title="Remove Agent"
        description={`Are you sure you want to remove "${displayName}"? This will terminate the agent process and cannot be undone.`}
        confirmLabel="Remove"
        variant="danger"
      />
    </>
  );
}
