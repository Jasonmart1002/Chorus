import type { AgentStatus } from "../types/agent";
import type { SDKMessage } from "../types/messages";

export function detectStatus(message: SDKMessage): AgentStatus | null {
  const type = (message as Record<string, unknown>).type as string | undefined;
  const subtype = (message as Record<string, unknown>).subtype as string | undefined;

  switch (type) {
    case "system":
      if (subtype === "init") return "awaiting_input";
      return null;
    case "assistant":
      return "working";
    case "result":
      return subtype === "success" ? "awaiting_input" : "errored";
    default:
      return null;
  }
}
