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
  system_prompt?: string;
  append_system_prompt?: string;
  max_turns?: number;
  max_budget_usd?: number;
  allowed_tools?: string[];
  disallowed_tools?: string[];
  additional_dirs?: string[];
}

export interface Agent {
  id: string;
  config: AgentConfig;
  status: AgentStatus;
  session_id: string;
  created_at: string;
}
