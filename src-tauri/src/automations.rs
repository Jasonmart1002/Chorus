use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use tauri::Emitter;
use tokio::sync::Mutex;

use crate::agent::manager::AgentManager;
use crate::agent::process::AgentProcess;
use crate::agent::state::{AgentConfig, AgentStatus, Engine};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ScheduleFrequency {
    Daily,
    Weekly,
    Monthly,
    Custom,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum DayOfWeek {
    Mo,
    Tu,
    We,
    Th,
    Fr,
    Sa,
    Su,
}

impl DayOfWeek {
    fn to_chrono(&self) -> chrono::Weekday {
        match self {
            DayOfWeek::Mo => chrono::Weekday::Mon,
            DayOfWeek::Tu => chrono::Weekday::Tue,
            DayOfWeek::We => chrono::Weekday::Wed,
            DayOfWeek::Th => chrono::Weekday::Thu,
            DayOfWeek::Fr => chrono::Weekday::Fri,
            DayOfWeek::Sa => chrono::Weekday::Sat,
            DayOfWeek::Su => chrono::Weekday::Sun,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AutomationSchedule {
    pub frequency: ScheduleFrequency,
    pub days: Vec<DayOfWeek>,
    #[serde(default)]
    pub dates: Vec<u32>, // 1–31, used for monthly
    pub time: String, // "HH:MM" 24h
    pub custom_interval_minutes: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AutomationTarget {
    pub agent_id: Option<String>,
    pub agent_name: Option<String>,
    pub agent_cwd: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Automation {
    pub id: String,
    pub name: String,
    pub prompt: String,
    pub schedule: AutomationSchedule,
    pub target: AutomationTarget,
    pub enabled: bool,
    pub created_at: String,
    pub last_run_at: Option<String>,
    pub next_run_at: Option<String>,
    pub last_run_status: Option<String>, // "success" | "error"
    pub run_count: u32,
    #[serde(default)]
    pub skip_permissions: bool,
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

pub type AutomationsStateHandle = Arc<Mutex<AutomationsState>>;

pub struct AutomationsState {
    pub automations: Vec<Automation>,
}

impl AutomationsState {
    pub fn load() -> Self {
        let automations = match Self::read_file() {
            Ok(list) => list,
            Err(_) => Vec::new(),
        };
        Self { automations }
    }

    fn data_path() -> PathBuf {
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
        dir.join("automations.json")
    }

    fn read_file() -> Result<Vec<Automation>, String> {
        let path = Self::data_path();
        if !path.exists() {
            return Ok(Vec::new());
        }
        let content =
            std::fs::read_to_string(&path).map_err(|e| format!("Read error: {}", e))?;
        serde_json::from_str(&content).map_err(|e| format!("Parse error: {}", e))
    }

    fn save(&self) -> Result<(), String> {
        let path = Self::data_path();
        let json = serde_json::to_string_pretty(&self.automations)
            .map_err(|e| format!("Serialize error: {}", e))?;
        let tmp_path = path.with_extension("json.tmp");
        std::fs::write(&tmp_path, json).map_err(|e| format!("Write error: {}", e))?;
        std::fs::rename(&tmp_path, &path).map_err(|e| format!("Rename error: {}", e))
    }
}

// ---------------------------------------------------------------------------
// Running automations tracking
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize)]
pub struct RunningAutomationInfo {
    pub automation_id: String,
    pub automation_name: String,
    pub agent_id: String,
    pub started_at: String,
}

pub type RunningAutomationsHandle = Arc<Mutex<HashMap<String, RunningAutomationInfo>>>;

#[derive(Serialize, Clone)]
pub struct AutomationStarted {
    pub automation_id: String,
    pub automation_name: String,
    pub agent_id: String,
}

#[derive(Serialize, Clone)]
pub struct AutomationCompleted {
    pub automation_id: String,
    pub automation_name: String,
    pub agent_id: String,
}

#[derive(Serialize, Clone)]
pub struct AutomationStopped {
    pub automation_id: String,
    pub automation_name: String,
    pub agent_id: String,
}

// ---------------------------------------------------------------------------
// Schedule helpers
// ---------------------------------------------------------------------------

fn parse_time(time_str: &str) -> Option<(u32, u32)> {
    let parts: Vec<&str> = time_str.split(':').collect();
    if parts.len() != 2 {
        return None;
    }
    let hour = parts[0].parse::<u32>().ok()?;
    let minute = parts[1].parse::<u32>().ok()?;
    Some((hour, minute))
}

pub fn compute_next_run(schedule: &AutomationSchedule) -> Option<String> {
    use chrono::{Datelike, Local, NaiveTime, TimeZone};

    let now = Local::now();

    match schedule.frequency {
        ScheduleFrequency::Custom => {
            let mins = schedule.custom_interval_minutes.unwrap_or(60) as i64;
            let next = now + chrono::Duration::minutes(mins);
            Some(next.to_rfc3339())
        }
        ScheduleFrequency::Daily => {
            let (h, m) = parse_time(&schedule.time)?;
            let today_target = now
                .date_naive()
                .and_hms_opt(h, m, 0)?;
            let today_target = Local.from_local_datetime(&today_target).earliest()?;
            if today_target > now {
                Some(today_target.to_rfc3339())
            } else {
                let tomorrow = today_target + chrono::Duration::days(1);
                Some(tomorrow.to_rfc3339())
            }
        }
        ScheduleFrequency::Weekly => {
            if schedule.days.is_empty() {
                return None;
            }
            let (h, m) = parse_time(&schedule.time)?;
            let target_time = NaiveTime::from_hms_opt(h, m, 0)?;

            // Find the next matching day within the next 8 days
            let mut best: Option<chrono::DateTime<Local>> = None;
            for offset in 0..8 {
                let candidate_date = (now + chrono::Duration::days(offset)).date_naive();
                let candidate_weekday = candidate_date.weekday();
                let matches = schedule.days.iter().any(|d| d.to_chrono() == candidate_weekday);
                if matches {
                    let candidate_dt = candidate_date.and_time(target_time);
                    let candidate = Local.from_local_datetime(&candidate_dt).earliest()?;
                    if candidate > now {
                        best = Some(candidate);
                        break;
                    }
                }
            }
            best.map(|dt| dt.to_rfc3339())
        }
        ScheduleFrequency::Monthly => {
            if schedule.dates.is_empty() {
                return None;
            }
            let (h, m) = parse_time(&schedule.time)?;
            let target_time = NaiveTime::from_hms_opt(h, m, 0)?;

            // Find the next matching date-of-month within the next 62 days
            let mut best: Option<chrono::DateTime<Local>> = None;
            for offset in 0..62 {
                let candidate_date = (now + chrono::Duration::days(offset)).date_naive();
                let day_of_month = candidate_date.day();
                let matches = schedule.dates.iter().any(|&d| d == day_of_month);
                if matches {
                    let candidate_dt = candidate_date.and_time(target_time);
                    let candidate = Local.from_local_datetime(&candidate_dt).earliest()?;
                    if candidate > now {
                        best = Some(candidate);
                        break;
                    }
                }
            }
            best.map(|dt| dt.to_rfc3339())
        }
    }
}

// ---------------------------------------------------------------------------
// Tick — called every 60s from background task
// ---------------------------------------------------------------------------

#[derive(Serialize, Clone)]
pub struct AutomationFired {
    pub automation_id: String,
    pub automation_name: String,
    pub agent_id: String,
}

pub async fn tick(
    auto_state: &AutomationsStateHandle,
    manager: &Arc<Mutex<AgentManager>>,
    app: &tauri::AppHandle,
) {
    use chrono::Local;

    let now = Local::now();
    let now_str = now.to_rfc3339();

    // Collect automations that are due
    let due: Vec<Automation> = {
        let state = auto_state.lock().await;
        state
            .automations
            .iter()
            .filter(|a| {
                if !a.enabled {
                    return false;
                }
                match &a.next_run_at {
                    Some(next) => next.as_str() <= now_str.as_str(),
                    None => false,
                }
            })
            .cloned()
            .collect()
    };

    for automation in &due {
        let result = fire_automation(automation, manager, app).await;
        let (status, agent_id) = match &result {
            Ok(id) => ("success", id.clone()),
            Err(e) => {
                eprintln!("Automation '{}' failed: {}", automation.name, e);
                ("error", String::new())
            }
        };

        // Update state
        {
            let mut state = auto_state.lock().await;
            if let Some(a) = state.automations.iter_mut().find(|a| a.id == automation.id) {
                a.last_run_at = Some(now_str.clone());
                a.last_run_status = Some(status.to_string());
                a.run_count += 1;
                a.next_run_at = compute_next_run(&a.schedule);
                let _ = state.save();
            }
        }

        let _ = app.emit(
            "automation-fired",
            AutomationFired {
                automation_id: automation.id.clone(),
                automation_name: automation.name.clone(),
                agent_id,
            },
        );
    }
}

async fn fire_automation(
    automation: &Automation,
    manager: &Arc<Mutex<AgentManager>>,
    app: &tauri::AppHandle,
) -> Result<String, String> {
    let target = &automation.target;

    // If targeting an existing agent, send prompt to it
    if let Some(ref agent_id) = target.agent_id {
        let mgr = manager.lock().await;
        let engine = mgr
            .agents
            .get(agent_id)
            .map(|a| a.config.engine.clone())
            .unwrap_or(Engine::Claude);
        let process = mgr
            .processes
            .get(agent_id)
            .ok_or_else(|| format!("Agent {} not found", agent_id))?;
        process.send(&automation.prompt, &engine).await?;
        return Ok(agent_id.clone());
    }

    // Otherwise create a new agent
    let agent_name = target
        .agent_name
        .clone()
        .unwrap_or_else(|| automation.name.clone());
    let cwd = target
        .agent_cwd
        .clone()
        .ok_or("No working directory specified for new agent")?;

    if !std::path::Path::new(&cwd).is_dir() {
        return Err(format!("Directory does not exist: {}", cwd));
    }

    let agent_id = uuid::Uuid::new_v4().to_string();
    let session_id = uuid::Uuid::new_v4().to_string();
    let perm_mode = if automation.skip_permissions {
        "dangerouslySkipPermissions".to_string()
    } else {
        "bypassPermissions".to_string()
    };
    let engine = Engine::Claude; // Automations default to Claude

    let config = AgentConfig {
        name: agent_name,
        cwd: cwd.clone(),
        model: None,
        permission_mode: perm_mode.clone(),
        engine: engine.clone(),
        system_prompt: None,
        append_system_prompt: None,
        max_turns: None,
        max_budget_usd: None,
        allowed_tools: None,
        disallowed_tools: None,
        additional_dirs: None,
    };

    let process = AgentProcess::spawn(
        agent_id.clone(),
        cwd,
        session_id.clone(),
        &config,
        app.clone(),
    )?;

    {
        let mut mgr = manager.lock().await;
        mgr.add_agent(agent_id.clone(), config, session_id, process);
    }

    // Brief delay for the agent to initialize, then send the prompt
    tokio::time::sleep(std::time::Duration::from_secs(2)).await;

    {
        let mgr = manager.lock().await;
        if let Some(process) = mgr.processes.get(&agent_id) {
            process.send(&automation.prompt, &engine).await?;
        }
    }

    Ok(agent_id)
}

// ---------------------------------------------------------------------------
// Tauri commands
// ---------------------------------------------------------------------------

#[tauri::command]
pub async fn list_automations(
    state: tauri::State<'_, AutomationsStateHandle>,
) -> Result<Vec<Automation>, String> {
    let s = state.lock().await;
    Ok(s.automations.clone())
}

#[tauri::command]
pub async fn create_automation(
    name: String,
    prompt: String,
    schedule: AutomationSchedule,
    target: AutomationTarget,
    skip_permissions: Option<bool>,
    state: tauri::State<'_, AutomationsStateHandle>,
) -> Result<Automation, String> {
    let mut s = state.lock().await;

    let mut automation = Automation {
        id: uuid::Uuid::new_v4().to_string(),
        name,
        prompt,
        schedule,
        target,
        enabled: true,
        created_at: chrono::Local::now().to_rfc3339(),
        last_run_at: None,
        next_run_at: None,
        last_run_status: None,
        run_count: 0,
        skip_permissions: skip_permissions.unwrap_or(false),
    };

    automation.next_run_at = compute_next_run(&automation.schedule);
    s.automations.push(automation.clone());
    s.save()?;

    Ok(automation)
}

#[tauri::command]
pub async fn update_automation(
    id: String,
    name: Option<String>,
    prompt: Option<String>,
    schedule: Option<AutomationSchedule>,
    target: Option<AutomationTarget>,
    enabled: Option<bool>,
    skip_permissions: Option<bool>,
    state: tauri::State<'_, AutomationsStateHandle>,
) -> Result<Automation, String> {
    let mut s = state.lock().await;
    let automation = s
        .automations
        .iter_mut()
        .find(|a| a.id == id)
        .ok_or_else(|| format!("Automation {} not found", id))?;

    if let Some(n) = name {
        automation.name = n;
    }
    if let Some(p) = prompt {
        automation.prompt = p;
    }
    if let Some(sched) = schedule {
        automation.schedule = sched;
        automation.next_run_at = compute_next_run(&automation.schedule);
    }
    if let Some(t) = target {
        automation.target = t;
    }
    if let Some(e) = enabled {
        automation.enabled = e;
        if e {
            automation.next_run_at = compute_next_run(&automation.schedule);
        }
    }
    if let Some(sp) = skip_permissions {
        automation.skip_permissions = sp;
    }

    let result = automation.clone();
    s.save()?;
    Ok(result)
}

#[tauri::command]
pub async fn delete_automation(
    id: String,
    state: tauri::State<'_, AutomationsStateHandle>,
) -> Result<(), String> {
    let mut s = state.lock().await;
    s.automations.retain(|a| a.id != id);
    s.save()
}

#[tauri::command]
pub async fn run_automation_now(
    id: String,
    auto_state: tauri::State<'_, AutomationsStateHandle>,
    running_autos: tauri::State<'_, RunningAutomationsHandle>,
    manager: tauri::State<'_, Arc<Mutex<AgentManager>>>,
    app: tauri::AppHandle,
) -> Result<String, String> {
    // Check if already running
    {
        let running = running_autos.lock().await;
        if running.contains_key(&id) {
            return Err("Automation is already running".to_string());
        }
    }

    let automation = {
        let s = auto_state.lock().await;
        s.automations
            .iter()
            .find(|a| a.id == id)
            .cloned()
            .ok_or_else(|| format!("Automation {} not found", id))?
    };

    let agent_id = fire_automation(&automation, manager.inner(), &app).await?;

    // Track as running
    let info = RunningAutomationInfo {
        automation_id: id.clone(),
        automation_name: automation.name.clone(),
        agent_id: agent_id.clone(),
        started_at: chrono::Local::now().to_rfc3339(),
    };
    {
        let mut running = running_autos.lock().await;
        running.insert(id.clone(), info);
    }

    // Emit started event
    let _ = app.emit(
        "automation-started",
        AutomationStarted {
            automation_id: id.clone(),
            automation_name: automation.name.clone(),
            agent_id: agent_id.clone(),
        },
    );

    // Update run stats
    {
        let mut s = auto_state.lock().await;
        if let Some(a) = s.automations.iter_mut().find(|a| a.id == id) {
            a.last_run_at = Some(chrono::Local::now().to_rfc3339());
            a.last_run_status = Some("success".to_string());
            a.run_count += 1;
            let _ = s.save();
        }
    }

    let _ = app.emit(
        "automation-fired",
        AutomationFired {
            automation_id: automation.id.clone(),
            automation_name: automation.name.clone(),
            agent_id: agent_id.clone(),
        },
    );

    // Spawn background task to monitor agent completion
    let running_handle = running_autos.inner().clone();
    let manager_handle = manager.inner().clone();
    let auto_state_handle = auto_state.inner().clone();
    let app_handle = app.clone();
    let auto_id = id.clone();
    let auto_name = automation.name.clone();
    let monitored_agent_id = agent_id.clone();
    tauri::async_runtime::spawn(async move {
        monitor_automation_agent(
            auto_id,
            auto_name,
            monitored_agent_id,
            running_handle,
            manager_handle,
            auto_state_handle,
            app_handle,
        )
        .await;
    });

    Ok(agent_id)
}

/// Monitors an agent spawned by an automation. When it enters idle/awaiting_input/exited
/// state (meaning it finished processing), mark the automation as completed.
async fn monitor_automation_agent(
    automation_id: String,
    automation_name: String,
    agent_id: String,
    running: RunningAutomationsHandle,
    manager: Arc<Mutex<AgentManager>>,
    auto_state: AutomationsStateHandle,
    app: tauri::AppHandle,
) {
    // Wait for the agent to start working before monitoring for completion.
    // The agent starts idle, transitions to working when it processes the prompt.
    let mut saw_working = false;

    // Initial delay — let the agent process the prompt before polling
    tokio::time::sleep(std::time::Duration::from_secs(5)).await;

    loop {
        tokio::time::sleep(std::time::Duration::from_secs(2)).await;

        // Check if still tracked as running (might have been stopped)
        {
            let r = running.lock().await;
            if !r.contains_key(&automation_id) {
                return; // Was stopped or already removed
            }
        }

        // Check agent status
        let status = {
            let mgr = manager.lock().await;
            mgr.agents
                .get(&agent_id)
                .map(|a| a.status.clone())
        };

        match status {
            Some(AgentStatus::Working) => {
                saw_working = true;
            }
            Some(AgentStatus::Idle) | Some(AgentStatus::AwaitingInput) if saw_working => {
                // Agent was working and is now done
                {
                    let mut r = running.lock().await;
                    r.remove(&automation_id);
                }

                let _ = app.emit(
                    "automation-completed",
                    AutomationCompleted {
                        automation_id: automation_id.clone(),
                        automation_name: automation_name.clone(),
                        agent_id: agent_id.clone(),
                    },
                );

                {
                    let mut s = auto_state.lock().await;
                    if let Some(a) = s.automations.iter_mut().find(|a| a.id == automation_id) {
                        a.last_run_status = Some("success".to_string());
                        let _ = s.save();
                    }
                }

                return;
            }
            Some(AgentStatus::Exited) | None => {
                // Agent died or was removed
                {
                    let mut r = running.lock().await;
                    r.remove(&automation_id);
                }

                let _ = app.emit(
                    "automation-completed",
                    AutomationCompleted {
                        automation_id: automation_id.clone(),
                        automation_name: automation_name.clone(),
                        agent_id: agent_id.clone(),
                    },
                );

                {
                    let mut s = auto_state.lock().await;
                    if let Some(a) = s.automations.iter_mut().find(|a| a.id == automation_id) {
                        a.last_run_status = if saw_working {
                            Some("success".to_string())
                        } else {
                            Some("error".to_string())
                        };
                        let _ = s.save();
                    }
                }

                return;
            }
            _ => {
                // Still initializing or working, continue polling
            }
        }
    }
}

#[tauri::command]
pub async fn stop_automation(
    id: String,
    running_autos: tauri::State<'_, RunningAutomationsHandle>,
    manager: tauri::State<'_, Arc<Mutex<AgentManager>>>,
    app: tauri::AppHandle,
) -> Result<(), String> {
    let info = {
        let mut running = running_autos.lock().await;
        running
            .remove(&id)
            .ok_or_else(|| format!("Automation {} is not running", id))?
    };

    // Kill the agent
    {
        let mut mgr = manager.lock().await;
        if let Some(process) = mgr.processes.get_mut(&info.agent_id) {
            let _ = process.kill();
        }
        mgr.update_status(&info.agent_id, AgentStatus::Exited);
    }

    let _ = app.emit(
        "automation-stopped",
        AutomationStopped {
            automation_id: info.automation_id,
            automation_name: info.automation_name,
            agent_id: info.agent_id,
        },
    );

    Ok(())
}

#[tauri::command]
pub async fn get_running_automations(
    running_autos: tauri::State<'_, RunningAutomationsHandle>,
) -> Result<Vec<RunningAutomationInfo>, String> {
    let running = running_autos.lock().await;
    Ok(running.values().cloned().collect())
}
