import { useAgentStore } from "../../store/agentStore";
import { useThemeStore } from "../../store/themeStore";
import { AgentView } from "./AgentView";
import { Bot } from "lucide-react";

export function MainPanel() {
  const selectedAgentId = useAgentStore((s) => s.selectedAgentId);
  const theme = useThemeStore((s) => s.current);

  if (!selectedAgentId) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: theme.textMuted,
          gap: 12,
        }}
      >
        <Bot size={48} strokeWidth={1.5} />
        <div style={{ fontSize: 16, fontWeight: 500, fontFamily: theme.fontHeading, color: theme.textSecondary }}>
          No agent selected
        </div>
        <div style={{ fontSize: 13 }}>Create a new agent or select one from the sidebar</div>
        <kbd
          style={{
            marginTop: 8,
            padding: "4px 10px",
            background: theme.bgBase,
            borderRadius: 6,
            fontSize: 12,
            color: theme.textSecondary,
            border: `1px solid ${theme.mauve}`,
            boxShadow: theme.shadowChunky,
            fontFamily: theme.fontCode,
          }}
        >
          Cmd+N
        </kbd>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, height: "100%", overflow: "hidden" }}>
      <AgentView agentId={selectedAgentId} />
    </div>
  );
}
