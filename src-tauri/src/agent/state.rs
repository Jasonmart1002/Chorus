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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentConfig {
    pub name: String,
    pub cwd: String,
    pub model: Option<String>,
    pub permission_mode: String,
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
