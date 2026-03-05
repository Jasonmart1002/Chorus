use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum AgentStatus {
    Idle,
    Working,
    AwaitingInput,
    Errored,
    Exited,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum Engine {
    Claude,
    Codex,
    Gemini,
}

impl std::fmt::Display for Engine {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Engine::Claude => write!(f, "claude"),
            Engine::Codex => write!(f, "codex"),
            Engine::Gemini => write!(f, "gemini"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentConfig {
    pub name: String,
    pub cwd: String,
    pub model: Option<String>,
    pub permission_mode: String,
    pub engine: Engine,
    #[serde(default)]
    pub system_prompt: Option<String>,
    #[serde(default)]
    pub append_system_prompt: Option<String>,
    #[serde(default)]
    pub max_turns: Option<u32>,
    #[serde(default)]
    pub max_budget_usd: Option<f64>,
    #[serde(default)]
    pub allowed_tools: Option<Vec<String>>,
    #[serde(default)]
    pub disallowed_tools: Option<Vec<String>>,
    #[serde(default)]
    pub additional_dirs: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentState {
    pub id: String,
    pub config: AgentConfig,
    pub status: AgentStatus,
    pub session_id: String,
    pub created_at: String,
    pub cost_usd: f64,
    pub num_turns: u32,
}
