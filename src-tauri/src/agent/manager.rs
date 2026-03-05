use std::collections::HashMap;
use std::path::PathBuf;

use super::process::AgentProcess;
use super::state::{AgentConfig, AgentState, AgentStatus};

/// Persistent record for a saved agent (no process, just metadata).
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct SavedAgent {
    pub id: String,
    pub config: AgentConfig,
    pub session_id: String,
    pub created_at: String,
    pub cost_usd: f64,
    pub num_turns: u32,
}

pub struct AgentManager {
    pub agents: HashMap<String, AgentState>,
    pub processes: HashMap<String, AgentProcess>,
}

impl AgentManager {
    pub fn new() -> Self {
        Self {
            agents: HashMap::new(),
            processes: HashMap::new(),
        }
    }

    /// Load saved agents from disk as exited (no processes running).
    pub fn load_saved(&mut self) {
        if let Ok(saved) = Self::read_saved() {
            for s in saved {
                // Only load if not already present (e.g. already running)
                if !self.agents.contains_key(&s.id) {
                    self.agents.insert(
                        s.id.clone(),
                        AgentState {
                            id: s.id,
                            config: s.config,
                            status: AgentStatus::Exited,
                            session_id: s.session_id,
                            created_at: s.created_at,
                            cost_usd: s.cost_usd,
                            num_turns: s.num_turns,
                        },
                    );
                }
            }
        }
    }

    pub fn add_agent(
        &mut self,
        id: String,
        config: AgentConfig,
        session_id: String,
        process: AgentProcess,
    ) {
        let state = AgentState {
            id: id.clone(),
            config,
            status: AgentStatus::Idle,
            session_id,
            created_at: chrono::Utc::now().to_rfc3339(),
            cost_usd: 0.0,
            num_turns: 0,
        };
        self.agents.insert(id.clone(), state);
        self.processes.insert(id, process);
        let _ = self.save();
    }

    pub fn update_status(&mut self, id: &str, status: AgentStatus) {
        if let Some(agent) = self.agents.get_mut(id) {
            agent.status = status;
        }
    }

    #[allow(dead_code)]
    pub fn update_cost(&mut self, id: &str, cost: f64, turns: u32) {
        if let Some(agent) = self.agents.get_mut(id) {
            agent.cost_usd = cost;
            agent.num_turns = turns;
        }
    }

    pub fn remove_agent(&mut self, id: &str) {
        self.agents.remove(id);
        self.processes.remove(id);
        let _ = self.save();
    }

    pub fn list_agents(&self) -> Vec<AgentState> {
        self.agents.values().cloned().collect()
    }

    // -----------------------------------------------------------------------
    // Persistence
    // -----------------------------------------------------------------------

    fn data_dir() -> PathBuf {
        #[cfg(unix)]
        let dir = {
            let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
            PathBuf::from(home).join(".chorus")
        };
        #[cfg(windows)]
        let dir = {
            let appdata = std::env::var("APPDATA").unwrap_or_else(|_| ".".to_string());
            PathBuf::from(appdata).join("Chorus")
        };
        let _ = std::fs::create_dir_all(&dir);
        dir
    }

    fn agents_path() -> PathBuf {
        Self::data_dir().join("agents.json")
    }

    fn read_saved() -> Result<Vec<SavedAgent>, String> {
        let path = Self::agents_path();
        if !path.exists() {
            return Ok(Vec::new());
        }
        let content =
            std::fs::read_to_string(&path).map_err(|e| format!("Read error: {}", e))?;
        serde_json::from_str(&content).map_err(|e| format!("Parse error: {}", e))
    }

    /// Save all current agents to disk (atomic write via temp file + rename).
    pub fn save(&self) -> Result<(), String> {
        let saved: Vec<SavedAgent> = self
            .agents
            .values()
            .map(|a| SavedAgent {
                id: a.id.clone(),
                config: a.config.clone(),
                session_id: a.session_id.clone(),
                created_at: a.created_at.clone(),
                cost_usd: a.cost_usd,
                num_turns: a.num_turns,
            })
            .collect();
        let path = Self::agents_path();
        let json = serde_json::to_string_pretty(&saved)
            .map_err(|e| format!("Serialize error: {}", e))?;
        let tmp_path = path.with_extension("json.tmp");
        std::fs::write(&tmp_path, json).map_err(|e| format!("Write error: {}", e))?;
        std::fs::rename(&tmp_path, &path).map_err(|e| format!("Rename error: {}", e))
    }
}
