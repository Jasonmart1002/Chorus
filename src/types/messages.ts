export interface SystemInitMessage {
  type: "system";
  subtype: "init";
  session_id: string;
  tools: string[];
}

export interface SystemGenericMessage {
  type: "system";
  subtype: string;
  session_id?: string;
  [key: string]: unknown;
}

export interface AssistantMessage {
  type: "assistant";
  message: {
    content: ContentBlock[];
  };
  session_id?: string;
}

export interface ResultMessage {
  type: "result";
  subtype: "success" | "error_max_turns" | "error_tool_use";
  result: string;
  total_cost_usd?: number;
  num_turns?: number;
  session_id?: string;
}

export type ContentBlock =
  | TextBlock
  | ToolUseBlock
  | ToolResultBlock;

export interface TextBlock {
  type: "text";
  text: string;
}

export interface ToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResultBlock {
  type: "tool_result";
  tool_use_id: string;
  content: string;
}

export interface UserPromptMessage {
  type: "user_prompt";
  text: string;
  timestamp: number;
}

export type SDKMessage = SystemInitMessage | SystemGenericMessage | AssistantMessage | ResultMessage | UserPromptMessage;

export interface AgentMessageEvent {
  agent_id: string;
  message: SDKMessage;
}

export interface StatusChangeEvent {
  agent_id: string;
  status: string;
}

export interface AttentionEvent {
  agent_id: string;
  agent_name: string;
  reason: string;
}

export interface StderrEvent {
  agent_id: string;
  line: string;
}
