import type { AgentStatus } from "../types/agent";
import type { SDKMessage } from "../types/messages";

export function detectStatus(message: SDKMessage): AgentStatus | null {
  switch (message.type) {
    case "system":
      if (message.subtype === "init") return "awaiting_input";
      return null;
    case "assistant":
      return "working";
    case "result":
      return message.subtype === "success" ? "awaiting_input" : "errored";
    default:
      return null;
  }
}
