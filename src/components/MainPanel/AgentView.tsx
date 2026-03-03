import { useState } from "react";
import { RotateCcw, Loader2 } from "lucide-react";
import { useAgentStore } from "../../store/agentStore";
import { useThemeStore } from "../../store/themeStore";
import { MessageStream } from "./MessageStream";
import { ContextSummary } from "./ContextSummary";
import { PromptInput } from "../PromptInput/PromptInput";

interface Props {
  agentId: string;
}

function RestartBanner({ agentId }: { agentId: string }) {
  const theme = useThemeStore((s) => s.current);
  const restoreAgent = useAgentStore((s) => s.restoreAgent);
  const [loading, setLoading] = useState(false);

  const handleRestart = async () => {
    setLoading(true);
    try {
      await restoreAgent(agentId);
    } catch {
      // Error toast already shown by store
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        padding: "14px 20px 18px",
        background: theme.bgSurface,
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: `${theme.peach}88`,
        }}
      />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          background: theme.bgBase,
          borderRadius: theme.borderRadiusSm,
          padding: "12px 16px",
          border: `2px solid ${theme.borderStrong}`,
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontFamily: theme.fontBody,
            color: theme.textSecondary,
            fontWeight: 600,
          }}
        >
          This session has ended. Restart to continue the conversation.
        </div>
        <button
          onClick={handleRestart}
          disabled={loading}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 16px",
            background: theme.accentGradient,
            border: `2px solid ${theme.borderStrong}`,
            borderRadius: theme.borderRadiusSm,
            boxShadow: theme.shadowChunky,
            cursor: loading ? "default" : "pointer",
            fontSize: 13,
            fontWeight: 700,
            fontFamily: theme.fontHeading,
            color: theme.textOnAccent,
            opacity: loading ? 0.7 : 1,
            transition: `all 0.2s ${theme.easeSpring}`,
            flexShrink: 0,
          }}
        >
          {loading ? (
            <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
          ) : (
            <RotateCcw size={14} strokeWidth={2.5} />
          )}
          Restart
        </button>
      </div>
    </div>
  );
}

const EMPTY_MESSAGES: import("../../types/messages").SDKMessage[] = [];

export function AgentView({ agentId }: Props) {
  const agent = useAgentStore((s) => s.agents[agentId]);
  const messages = useAgentStore(
    (s) => (s.agents[agentId] ? s.messages[agentId] || EMPTY_MESSAGES : EMPTY_MESSAGES)
  );

  if (!agent) return null;

  const isExited = agent.status === "exited";
  const canSend = agent.status === "awaiting_input" || agent.status === "idle";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <ContextSummary agent={agent} />
      <MessageStream key={agentId} messages={messages} agentId={agentId} />
      {isExited ? (
        <RestartBanner agentId={agentId} />
      ) : (
        <PromptInput agentId={agentId} disabled={!canSend} />
      )}
    </div>
  );
}
