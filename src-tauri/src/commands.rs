use std::sync::Arc;
use tauri::Emitter;
use tokio::sync::Mutex;

use crate::agent::adapters::{self, EngineInfo};
use crate::agent::manager::AgentManager;
use crate::agent::process::{AgentProcess, StatusChange};
use crate::agent::state::{AgentConfig, AgentState, AgentStatus, Engine};

type ManagerState = Arc<Mutex<AgentManager>>;
pub type RunningCommandState = Arc<Mutex<std::collections::HashMap<String, u32>>>;

#[derive(serde::Serialize, Clone)]
pub struct CreateAgentResult {
    pub agent_id: String,
    pub session_id: String,
}

#[tauri::command]
pub async fn create_agent(
    name: String,
    cwd: String,
    model: Option<String>,
    permission_mode: Option<String>,
    engine: Option<Engine>,
    manager: tauri::State<'_, ManagerState>,
    app: tauri::AppHandle,
) -> Result<CreateAgentResult, String> {
    if !std::path::Path::new(&cwd).is_dir() {
        return Err(format!("Directory does not exist: {}", cwd));
    }

    let agent_id = uuid::Uuid::new_v4().to_string();
    let session_id = uuid::Uuid::new_v4().to_string();
    let perm_mode = permission_mode.unwrap_or_else(|| "bypassPermissions".to_string());
    let engine = engine.unwrap_or(Engine::Claude);

    let config = AgentConfig {
        name: name.clone(),
        cwd: cwd.clone(),
        model: model.clone(),
        permission_mode: perm_mode.clone(),
        engine: engine.clone(),
    };

    let process = AgentProcess::spawn(
        agent_id.clone(),
        cwd,
        session_id.clone(),
        model,
        perm_mode,
        engine,
        app,
    )?;

    let mut mgr = manager.lock().await;
    mgr.add_agent(agent_id.clone(), config, session_id.clone(), process);

    Ok(CreateAgentResult { agent_id, session_id })
}

#[tauri::command]
pub async fn send_prompt(
    agent_id: String,
    text: String,
    manager: tauri::State<'_, ManagerState>,
) -> Result<(), String> {
    let mgr = manager.lock().await;
    let agent = mgr
        .agents
        .get(&agent_id)
        .ok_or_else(|| format!("Agent {} not found", agent_id))?;
    let engine = agent.config.engine.clone();
    let process = mgr
        .processes
        .get(&agent_id)
        .ok_or_else(|| format!("Agent {} not found", agent_id))?;
    process.send(&text, &engine).await
}

#[tauri::command]
pub async fn stop_agent(
    agent_id: String,
    manager: tauri::State<'_, ManagerState>,
    app: tauri::AppHandle,
) -> Result<(), String> {
    // `-p` mode doesn't handle SIGINT gracefully, so we do a transparent
    // kill+respawn with the same session-id. The conversation continues
    // seamlessly because the CLI reloads the session history on startup.

    // 1. Take ownership of old process and extract agent info
    let (config, session_id, mut old_process) = {
        let mut mgr = manager.lock().await;
        let agent = mgr
            .agents
            .get(&agent_id)
            .ok_or_else(|| format!("Agent {} not found", agent_id))?;
        let config = agent.config.clone();
        let session_id = agent.session_id.clone();
        let process = mgr
            .processes
            .remove(&agent_id)
            .ok_or_else(|| format!("No process for agent {}", agent_id))?;
        (config, session_id, process)
    }; // lock dropped

    // 2. Suppress the "exited" status event from the dying process
    old_process.set_suppress_exit(true);

    // 3. Send SIGTERM — allows the CLI to save session state gracefully
    old_process.terminate();

    // 4. Wait up to 3 seconds for graceful exit
    let exited = tokio::time::timeout(
        std::time::Duration::from_secs(3),
        old_process.wait(),
    )
    .await;

    // 5. Force kill if still alive after timeout
    if exited.is_err() {
        let _ = old_process.kill();
        // Brief wait for SIGKILL to take effect
        tokio::time::sleep(std::time::Duration::from_millis(100)).await;
    }

    // 6. Drop old process and brief pause for session file release
    drop(old_process);
    tokio::time::sleep(std::time::Duration::from_millis(200)).await;

    // 7. Spawn replacement process with same session-id
    let new_process = match AgentProcess::spawn(
        agent_id.clone(),
        config.cwd.clone(),
        session_id,
        config.model.clone(),
        config.permission_mode.clone(),
        config.engine.clone(),
        app.clone(),
    ) {
        Ok(p) => p,
        Err(e) => {
            // Respawn failed — mark as exited
            let _ = app.emit(
                "agent-status-changed",
                StatusChange {
                    agent_id,
                    status: AgentStatus::Exited,
                },
            );
            return Err(e);
        }
    };

    // 8. Insert the new process
    {
        let mut mgr = manager.lock().await;
        mgr.processes.insert(agent_id, new_process);
    }

    Ok(())
}

#[tauri::command]
pub async fn kill_agent(
    agent_id: String,
    manager: tauri::State<'_, ManagerState>,
) -> Result<(), String> {
    let mut mgr = manager.lock().await;
    if let Some(process) = mgr.processes.get_mut(&agent_id) {
        process.kill()?;
    }
    mgr.update_status(&agent_id, crate::agent::state::AgentStatus::Exited);
    Ok(())
}

#[tauri::command]
pub async fn remove_agent(
    agent_id: String,
    manager: tauri::State<'_, ManagerState>,
) -> Result<(), String> {
    let mut mgr = manager.lock().await;
    // Kill if still running
    if let Some(process) = mgr.processes.get_mut(&agent_id) {
        let _ = process.kill();
    }
    mgr.remove_agent(&agent_id);
    Ok(())
}

#[tauri::command]
pub async fn list_agents(
    manager: tauri::State<'_, ManagerState>,
) -> Result<Vec<AgentState>, String> {
    let mgr = manager.lock().await;
    Ok(mgr.list_agents())
}

/// Restart an exited agent, re-spawning its process with the same session_id
/// so the CLI resumes the previous conversation.
#[tauri::command]
pub async fn restore_agent(
    agent_id: String,
    manager: tauri::State<'_, ManagerState>,
    app: tauri::AppHandle,
) -> Result<(), String> {
    let (config, session_id) = {
        let mgr = manager.lock().await;
        let agent = mgr
            .agents
            .get(&agent_id)
            .ok_or_else(|| format!("Agent {} not found", agent_id))?;
        if agent.status != AgentStatus::Exited {
            return Err("Agent is not exited — cannot restore".to_string());
        }
        (agent.config.clone(), agent.session_id.clone())
    };

    let process = AgentProcess::spawn(
        agent_id.clone(),
        config.cwd.clone(),
        session_id,
        config.model.clone(),
        config.permission_mode.clone(),
        config.engine.clone(),
        app.clone(),
    )?;

    {
        let mut mgr = manager.lock().await;
        mgr.processes.insert(agent_id.clone(), process);
        mgr.update_status(&agent_id, AgentStatus::Idle);
    }

    // Emit status change so frontend updates
    let _ = app.emit(
        "agent-status-changed",
        StatusChange {
            agent_id,
            status: AgentStatus::Idle,
        },
    );

    Ok(())
}

/// Detect which CLI engines are available on this system
#[tauri::command]
pub async fn detect_engines() -> Result<Vec<EngineInfo>, String> {
    Ok(adapters::detect_engines())
}

#[derive(serde::Serialize, Clone)]
pub struct CommandOutputLine {
    pub cwd: String,
    pub line: String,
    pub stream: String, // "stdout" or "stderr"
}

#[derive(serde::Serialize, Clone)]
pub struct CommandDone {
    pub cwd: String,
    pub exit_code: Option<i32>,
}

#[tauri::command]
pub async fn run_command(
    cwd: String,
    command: String,
    env_vars: Option<std::collections::HashMap<String, String>>,
    running_cmd: tauri::State<'_, RunningCommandState>,
    app: tauri::AppHandle,
) -> Result<(), String> {
    use std::process::Stdio;
    use tokio::io::{AsyncBufReadExt, BufReader};

    if !std::path::Path::new(&cwd).is_dir() {
        return Err(format!("Directory does not exist: {}", cwd));
    }

    #[cfg(unix)]
    let mut cmd = {
        let shell = std::env::var("SHELL").unwrap_or_else(|_| "sh".to_string());
        let mut c = tokio::process::Command::new(&shell);
        c.args(&["-lc", &command]);
        // Create a new process group so we can kill the entire tree
        unsafe {
            c.pre_exec(|| {
                libc::setpgid(0, 0);
                Ok(())
            });
        }
        c
    };

    #[cfg(windows)]
    let mut cmd = {
        use std::os::windows::process::CommandExt;
        const CREATE_NEW_PROCESS_GROUP: u32 = 0x00000200;
        let mut c = tokio::process::Command::new("cmd.exe");
        c.args(&["/c", &command]);
        c.creation_flags(CREATE_NEW_PROCESS_GROUP);
        c
    };

    cmd.current_dir(&cwd)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    if let Some(vars) = env_vars {
        for (key, value) in vars {
            cmd.env(key, value);
        }
    }

    let mut child = cmd
        .spawn()
        .map_err(|e| format!("Failed to run command: {}", e))?;

    // Store PID keyed by CWD so it can be killed
    let pid = child.id();
    if let Some(p) = pid {
        running_cmd.lock().await.insert(cwd.clone(), p);
    }

    let stdout = child.stdout.take();
    let stderr = child.stderr.take();

    // Stream stdout
    let app1 = app.clone();
    let cwd1 = cwd.clone();
    let stdout_task = tokio::spawn(async move {
        if let Some(out) = stdout {
            let reader = BufReader::new(out);
            let mut lines = reader.lines();
            while let Ok(Some(line)) = lines.next_line().await {
                let _ = app1.emit(
                    "command-output",
                    CommandOutputLine {
                        cwd: cwd1.clone(),
                        line,
                        stream: "stdout".to_string(),
                    },
                );
            }
        }
    });

    // Stream stderr
    let app2 = app.clone();
    let cwd2 = cwd.clone();
    let stderr_task = tokio::spawn(async move {
        if let Some(err) = stderr {
            let reader = BufReader::new(err);
            let mut lines = reader.lines();
            while let Ok(Some(line)) = lines.next_line().await {
                let _ = app2.emit(
                    "command-output",
                    CommandOutputLine {
                        cwd: cwd2.clone(),
                        line,
                        stream: "stderr".to_string(),
                    },
                );
            }
        }
    });

    // Wait for process in background, then emit done event
    let running_cmd_inner = running_cmd.inner().clone();
    let cwd3 = cwd;
    let app3 = app;
    tokio::spawn(async move {
        let _ = stdout_task.await;
        let _ = stderr_task.await;
        let exit_code = match child.wait().await {
            Ok(status) => status.code(),
            Err(_) => Some(1),
        };
        running_cmd_inner.lock().await.remove(&cwd3);
        let _ = app3.emit("command-done", CommandDone { cwd: cwd3, exit_code });
    });

    Ok(())
}

#[tauri::command]
pub async fn kill_running_command(
    cwd: String,
    running_cmd: tauri::State<'_, RunningCommandState>,
) -> Result<(), String> {
    if let Some(pid) = running_cmd.lock().await.remove(&cwd) {
        #[cfg(unix)]
        {
            // Kill the process group so child processes are also terminated
            let ret = unsafe { libc::kill(-(pid as i32), libc::SIGTERM) };
            if ret != 0 {
                // Fallback: kill just the process
                unsafe { libc::kill(pid as i32, libc::SIGKILL) };
            }
        }
        #[cfg(windows)]
        {
            let _ = std::process::Command::new("taskkill")
                .args(&["/PID", &pid.to_string(), "/T", "/F"])
                .output();
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn open_terminal(cwd: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let script = format!(
            r#"tell application "Terminal"
    do script "cd '{}'"
    activate
end tell"#,
            cwd.replace('\'', "'\\''")
        );
        tokio::process::Command::new("osascript")
            .arg("-e")
            .arg(&script)
            .spawn()
            .map_err(|e| format!("Failed to open terminal: {}", e))?;
    }

    #[cfg(target_os = "windows")]
    {
        tokio::process::Command::new("cmd.exe")
            .args(&["/K", &format!("cd /d \"{}\"", cwd)])
            .spawn()
            .map_err(|e| format!("Failed to open terminal: {}", e))?;
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        // Linux — try common terminal emulators in order of popularity
        let terminals: &[(&str, &[&str])] = &[
            ("x-terminal-emulator", &["--working-directory", &cwd]),
            ("gnome-terminal", &["--working-directory", &cwd]),
            ("konsole", &["--workdir", &cwd]),
            ("xfce4-terminal", &["--working-directory", &cwd]),
            ("alacritty", &["--working-directory", &cwd]),
            ("kitty", &["--directory", &cwd]),
            ("wezterm", &["start", "--cwd", &cwd]),
            ("xterm", &["-e", &format!("cd '{}' && $SHELL", cwd.replace('\'', "'\\''"))]),
        ];

        let mut launched = false;
        for (term, args) in terminals {
            if tokio::process::Command::new(term)
                .args(*args)
                .spawn()
                .is_ok()
            {
                launched = true;
                break;
            }
        }

        if !launched {
            return Err("Failed to open terminal: no supported terminal emulator found. Tried: x-terminal-emulator, gnome-terminal, konsole, xfce4-terminal, alacritty, kitty, wezterm, xterm".to_string());
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn open_claude_terminal(
    cwd: String,
    session_id: String,
) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let script = format!(
            r#"tell application "Terminal"
    do script "cd '{}' && claude --resume '{}'  "
    activate
end tell"#,
            cwd.replace('\'', "'\\''"),
            session_id.replace('\'', "'\\''"),
        );
        tokio::process::Command::new("osascript")
            .arg("-e")
            .arg(&script)
            .spawn()
            .map_err(|e| format!("Failed to open terminal: {}", e))?;
    }

    #[cfg(target_os = "windows")]
    {
        let cmd_str = format!("cd /d \"{}\" && claude --resume \"{}\"", cwd, session_id);
        tokio::process::Command::new("cmd.exe")
            .args(&["/K", &cmd_str])
            .spawn()
            .map_err(|e| format!("Failed to open terminal: {}", e))?;
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        let escaped_cwd = cwd.replace('\'', "'\\''");
        let escaped_sid = session_id.replace('\'', "'\\''");
        let shell_cmd = format!(
            "cd '{}' && claude --resume '{}'",
            escaped_cwd, escaped_sid
        );

        // Terminal emulators and how they accept a command to run
        let terminals: &[(&str, &[&str])] = &[
            ("x-terminal-emulator", &["-e", "bash", "-c", &shell_cmd]),
            ("gnome-terminal", &["--", "bash", "-c", &shell_cmd]),
            ("konsole", &["-e", "bash", "-c", &shell_cmd]),
            ("xfce4-terminal", &["-e", &format!("bash -c \"{}\"", shell_cmd)]),
            ("alacritty", &["-e", "bash", "-c", &shell_cmd]),
            ("kitty", &["bash", "-c", &shell_cmd]),
            ("wezterm", &["start", "--", "bash", "-c", &shell_cmd]),
            ("xterm", &["-e", "bash", "-c", &shell_cmd]),
        ];

        let mut launched = false;
        for (term, args) in terminals {
            if tokio::process::Command::new(term)
                .args(*args)
                .spawn()
                .is_ok()
            {
                launched = true;
                break;
            }
        }

        if !launched {
            return Err("Failed to open terminal: no supported terminal emulator found. Tried: x-terminal-emulator, gnome-terminal, konsole, xfce4-terminal, alacritty, kitty, wezterm, xterm".to_string());
        }
    }

    Ok(())
}

// ---------------------------------------------------------------------------
// Message persistence
// ---------------------------------------------------------------------------

fn messages_dir() -> std::path::PathBuf {
    #[cfg(unix)]
    let dir = {
        let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
        std::path::PathBuf::from(home).join(".chorus").join("sessions")
    };
    #[cfg(windows)]
    let dir = {
        let appdata = std::env::var("APPDATA").unwrap_or_else(|_| ".".to_string());
        std::path::PathBuf::from(appdata).join("Chorus").join("sessions")
    };
    let _ = std::fs::create_dir_all(&dir);
    dir
}

#[tauri::command]
pub async fn save_messages(
    agent_id: String,
    messages: Vec<serde_json::Value>,
) -> Result<(), String> {
    let dir = messages_dir().join(&agent_id);
    let _ = std::fs::create_dir_all(&dir);
    let path = dir.join("messages.json");
    let json = serde_json::to_string(&messages)
        .map_err(|e| format!("Serialize error: {}", e))?;
    std::fs::write(&path, json).map_err(|e| format!("Write error: {}", e))
}

#[tauri::command]
pub async fn load_messages(
    agent_id: String,
) -> Result<Vec<serde_json::Value>, String> {
    let path = messages_dir().join(&agent_id).join("messages.json");
    if !path.exists() {
        return Ok(Vec::new());
    }
    let content =
        std::fs::read_to_string(&path).map_err(|e| format!("Read error: {}", e))?;
    serde_json::from_str(&content).map_err(|e| format!("Parse error: {}", e))
}
