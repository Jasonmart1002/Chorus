export type AgentStatus =
  | "idle"
  | "working"
  | "awaiting_input"
  | "errored"
  | "exited";

export type Engine = "claude" | "codex" | "gemini";

export interface EngineInfo {
  engine: Engine;
  available: boolean;
  binary_path: string | null;
}

export const ENGINE_LABELS: Record<Engine, string> = {
  claude: "Claude Code",
  codex: "OpenAI Codex",
  gemini: "Gemini CLI",
};

export const ENGINE_INSTALL_HINTS: Record<Engine, string> = {
  claude: "npm install -g @anthropic-ai/claude-code",
  codex: "npm install -g @openai/codex",
  gemini: "npm install -g @google/gemini-cli",
};

export interface AgentConfig {
  name: string;
  cwd: string;
  model?: string;
  permission_mode: string;
  engine: Engine;
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
