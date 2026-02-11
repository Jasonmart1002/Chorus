import { useAgentStore } from "../../store/agentStore";
import { MessageStream } from "./MessageStream";
import { ContextSummary } from "./ContextSummary";
import { PromptInput } from "../PromptInput/PromptInput";

interface Props {
  agentId: string;
}

export function AgentView({ agentId }: Props) {
  const agent = useAgentStore((s) => s.agents[agentId]);
  const messages = useAgentStore((s) => s.messages[agentId] || []);

  if (!agent) return null;

  const canSend = agent.status === "awaiting_input" || agent.status === "idle";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <ContextSummary agent={agent} />
      <MessageStream messages={messages} agentId={agentId} />
      <PromptInput agentId={agentId} disabled={!canSend} />
    </div>
  );
}
