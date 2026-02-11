use std::collections::HashMap;

use super::process::AgentProcess;
use super::state::{AgentConfig, AgentState, AgentStatus};

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

    pub fn add_agent(&mut self, id: String, config: AgentConfig, session_id: String, process: AgentProcess) {
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
    }

    pub fn update_status(&mut self, id: &str, status: AgentStatus) {
        if let Some(agent) = self.agents.get_mut(id) {
            agent.status = status;
        }
    }

    pub fn update_cost(&mut self, id: &str, cost: f64, turns: u32) {
        if let Some(agent) = self.agents.get_mut(id) {
            agent.cost_usd = cost;
            agent.num_turns = turns;
        }
    }

    pub fn remove_agent(&mut self, id: &str) {
        self.agents.remove(id);
        self.processes.remove(id);
    }

    pub fn list_agents(&self) -> Vec<AgentState> {
        self.agents.values().cloned().collect()
    }
}
