import { Bell } from "lucide-react";
import { useAgentStore } from "../../store/agentStore";
import { useSidebarStore } from "../../store/sidebarStore";
import { useThemeStore } from "../../store/themeStore";
import { getDisplayName } from "../../lib/sortAgents";

export function NotificationBanner() {
  const attentionSet = useAgentStore((s) => s.attentionSet);
  const agents = useAgentStore((s) => s.agents);
  const selectAgent = useAgentStore((s) => s.selectAgent);
  const getPrefs = useSidebarStore((s) => s.getPrefs);
  const theme = useThemeStore((s) => s.current);

  const attentionIds = Object.keys(attentionSet);
  if (attentionIds.length === 0) return null;

  const firstId = attentionIds[0];
  const agent = agents[firstId];
  if (!agent) return null;

  const name = getDisplayName(agent, getPrefs(agent.id));
  const isError = agent.status === "errored";

  return (
    <div
      style={{
        padding: "8px 16px",
        background: isError ? theme.peachLight : theme.mintLight,
        borderBottom: `1px solid ${isError ? theme.peach : theme.mint}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        animation: "slideDown 0.2s ease-out",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Bell size={14} color={isError ? theme.peach : theme.mint} />
        <span style={{ fontSize: 13, color: theme.textPrimary }}>
          <strong>{name}</strong>
          {isError ? " encountered an error" : " needs your input"}
          {attentionIds.length > 1 && (
            <span style={{ color: theme.textSecondary }}> (+{attentionIds.length - 1} more)</span>
          )}
        </span>
      </div>
      <button
        onClick={() => selectAgent(firstId)}
        style={{
          padding: "4px 12px",
          background: theme.lavender,
          border: "none",
          borderRadius: 6,
          color: "white",
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
          boxShadow: theme.shadowChunky,
          fontFamily: theme.fontHeading,
        }}
      >
        Go to agent
      </button>
    </div>
  );
}
