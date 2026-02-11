export type AgentStatus =
  | "idle"
  | "working"
  | "awaiting_input"
  | "errored"
  | "exited";

export interface AgentConfig {
  name: string;
  cwd: string;
  model?: string;
  permission_mode: string;
}

export interface Agent {
  id: string;
  config: AgentConfig;
  status: AgentStatus;
  session_id: string;
  created_at: string;
  cost_usd: number;
  num_turns: number;
}
