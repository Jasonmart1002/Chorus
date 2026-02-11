use std::path::PathBuf;
use std::process::Stdio;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex, OnceLock};
use tauri::Emitter;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::{Child, Command};
use tokio::sync::mpsc;

use super::state::AgentStatus;

/// Global PID registry — tracks all spawned claude processes so they can be
/// killed reliably on app exit. Uses std::sync::Mutex (not tokio) so it's
/// always lockable from synchronous contexts like window event handlers.
fn pid_registry() -> &'static Mutex<Vec<u32>> {
    static REGISTRY: OnceLock<Mutex<Vec<u32>>> = OnceLock::new();
    REGISTRY.get_or_init(|| Mutex::new(Vec::new()))
}

/// Kill all tracked child processes. Called on app shutdown.
pub fn kill_all_children() {
    if let Ok(pids) = pid_registry().lock() {
        for &pid in pids.iter() {
            unsafe {
                libc::kill(pid as i32, libc::SIGKILL);
            }
        }
    }
}

fn register_pid(pid: u32) {
    if let Ok(mut pids) = pid_registry().lock() {
        pids.push(pid);
    }
}

fn unregister_pid(pid: u32) {
    if let Ok(mut pids) = pid_registry().lock() {
        pids.retain(|&p| p != pid);
    }
}

/// Resolve the `claude` binary path.
/// macOS app bundles don't inherit the user's shell PATH, so we search common locations.
fn resolve_claude_path() -> Result<PathBuf, String> {
    // Try PATH first (works when launched from terminal / tauri dev)
    if let Ok(path) = which::which("claude") {
        return Ok(path);
    }

    // Common install locations
    let home = std::env::var("HOME").unwrap_or_default();
    let candidates = [
        format!("{}/.local/bin/claude", home),
        format!("{}/.claude/bin/claude", home),
        "/usr/local/bin/claude".to_string(),
        "/opt/homebrew/bin/claude".to_string(),
    ];

    for candidate in &candidates {
        let path = PathBuf::from(candidate);
        if path.exists() {
            return Ok(path);
        }
    }

    Err("Could not find 'claude' binary. Searched PATH and common locations (~/.local/bin, ~/.claude/bin, /usr/local/bin, /opt/homebrew/bin). Is Claude Code installed?".to_string())
}

pub struct AgentProcess {
    child: Child,
    stdin_tx: mpsc::Sender<String>,
    suppress_exit: Arc<AtomicBool>,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct AgentMessage {
    pub agent_id: String,
    pub message: serde_json::Value,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct StatusChange {
    pub agent_id: String,
    pub status: AgentStatus,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct QueueEntry {
    pub agent_id: String,
    pub agent_name: String,
    pub reason: String,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct StderrLine {
    pub agent_id: String,
    pub line: String,
}

impl AgentProcess {
    pub fn spawn(
        agent_id: String,
        cwd: String,
        session_id: String,
        model: Option<String>,
        permission_mode: String,
        app_handle: tauri::AppHandle,
    ) -> Result<Self, String> {
        let claude_path = resolve_claude_path()?;

        let mut cmd = Command::new(&claude_path);
        cmd.arg("-p")
            .arg("--output-format")
            .arg("stream-json")
            .arg("--input-format")
            .arg("stream-json")
            .arg("--verbose")
            .arg("--session-id")
            .arg(&session_id)
            .arg("--permission-mode")
            .arg(&permission_mode);

        // AskUserQuestion gets auto-answered with a useless default in -p mode.
        // Disable it so Claude asks questions as text instead.
        // Plan mode tools (EnterPlanMode/ExitPlanMode) are kept — the UI handles them.
        if permission_mode == "bypassPermissions" {
            cmd.arg("--disallowed-tools").arg("AskUserQuestion");
        }

        if let Some(ref m) = model {
            cmd.arg("--model").arg(m);
        }

        cmd.current_dir(&cwd)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());

        let mut child = cmd.spawn().map_err(|e| format!("Failed to spawn claude: {}", e))?;

        // Track PID for reliable cleanup on app exit
        if let Some(pid) = child.id() {
            register_pid(pid);
        }

        let stdout = child.stdout.take().ok_or("Failed to capture stdout")?;
        let stderr = child.stderr.take().ok_or("Failed to capture stderr")?;
        let stdin = child.stdin.take().ok_or("Failed to capture stdin")?;

        // Stdin writer task
        let (stdin_tx, mut stdin_rx) = mpsc::channel::<String>(32);
        tokio::spawn(async move {
            let mut stdin = stdin;
            while let Some(msg) = stdin_rx.recv().await {
                if stdin.write_all(msg.as_bytes()).await.is_err() {
                    break;
                }
                if stdin.write_all(b"\n").await.is_err() {
                    break;
                }
                if stdin.flush().await.is_err() {
                    break;
                }
            }
        });

        let suppress_exit = Arc::new(AtomicBool::new(false));

        // Stdout reader task — parses NDJSON
        let aid = agent_id.clone();
        let handle = app_handle.clone();
        let suppress_exit_clone = suppress_exit.clone();
        let spawned_pid = child.id();
        tokio::spawn(async move {
            let reader = BufReader::new(stdout);
            let mut lines = reader.lines();
            while let Ok(Some(line)) = lines.next_line().await {
                if line.trim().is_empty() {
                    continue;
                }
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(&line) {
                    // Emit the raw message to frontend
                    let _ = handle.emit(
                        "agent-message",
                        AgentMessage {
                            agent_id: aid.clone(),
                            message: json.clone(),
                        },
                    );

                    // Detect status from message type
                    let msg_type = json.get("type").and_then(|v| v.as_str()).unwrap_or("");
                    let subtype = json.get("subtype").and_then(|v| v.as_str()).unwrap_or("");

                    let new_status = match msg_type {
                        "system" if subtype == "init" => Some(AgentStatus::AwaitingInput),
                        "assistant" => Some(AgentStatus::Working),
                        "result" => {
                            if subtype == "success" {
                                Some(AgentStatus::AwaitingInput)
                            } else {
                                Some(AgentStatus::Errored)
                            }
                        }
                        _ => None,
                    };

                    if let Some(status) = new_status {
                        let _ = handle.emit(
                            "agent-status-changed",
                            StatusChange {
                                agent_id: aid.clone(),
                                status: status.clone(),
                            },
                        );

                        // Queue triggers
                        if status == AgentStatus::AwaitingInput || status == AgentStatus::Errored {
                            // Only queue on result messages, not on init
                            if msg_type == "result" {
                                let reason = if status == AgentStatus::Errored {
                                    "errored"
                                } else {
                                    "completed"
                                };
                                let _ = handle.emit(
                                    "agent-entered-queue",
                                    QueueEntry {
                                        agent_id: aid.clone(),
                                        agent_name: String::new(), // filled by frontend
                                        reason: reason.to_string(),
                                    },
                                );
                            }
                        }
                    }
                }
            }

            // Stdout EOF — process exited
            if let Some(pid) = spawned_pid {
                unregister_pid(pid);
            }
            if !suppress_exit_clone.load(Ordering::Relaxed) {
                let _ = handle.emit(
                    "agent-status-changed",
                    StatusChange {
                        agent_id: aid.clone(),
                        status: AgentStatus::Exited,
                    },
                );
            }
        });

        // Stderr reader task
        let aid2 = agent_id.clone();
        let handle2 = app_handle;
        tokio::spawn(async move {
            let reader = BufReader::new(stderr);
            let mut lines = reader.lines();
            while let Ok(Some(line)) = lines.next_line().await {
                let _ = handle2.emit(
                    "agent-stderr",
                    StderrLine {
                        agent_id: aid2.clone(),
                        line,
                    },
                );
            }
        });

        Ok(AgentProcess {
            child,
            stdin_tx,
            suppress_exit,
        })
    }

    /// Suppress the Exited status emission when the process EOF is detected.
    /// Used before killing the process for a transparent restart.
    pub fn set_suppress_exit(&self, suppress: bool) {
        self.suppress_exit.store(suppress, Ordering::Relaxed);
    }

    pub async fn send(&self, text: &str) -> Result<(), String> {
        let msg = serde_json::json!({
            "type": "user",
            "message": {
                "role": "user",
                "content": [{"type": "text", "text": text}]
            }
        });
        self.stdin_tx
            .send(msg.to_string())
            .await
            .map_err(|e| format!("Failed to send to stdin: {}", e))
    }

    /// Send SIGTERM for graceful shutdown. Allows the process to save session state.
    pub fn terminate(&self) {
        if let Some(pid) = self.child.id() {
            unsafe {
                libc::kill(pid as i32, libc::SIGTERM);
            }
        }
    }

    /// Wait for the process to exit.
    pub async fn wait(&mut self) {
        let _ = self.child.wait().await;
    }

    /// Force kill the process immediately (SIGKILL).
    pub fn kill(&mut self) -> Result<(), String> {
        self.child
            .start_kill()
            .map_err(|e| format!("Failed to kill process: {}", e))
    }

    pub fn pid(&self) -> Option<u32> {
        self.child.id()
    }
}
