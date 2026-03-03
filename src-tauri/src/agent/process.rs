use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex, OnceLock};
use tauri::Emitter;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::{Child, Command};
use tokio::sync::mpsc;

use super::adapters::{self, ParsedEvent};
use super::state::{AgentStatus, Engine};

/// Global PID registry — tracks all spawned CLI processes so they can be
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
            #[cfg(unix)]
            unsafe {
                libc::kill(pid as i32, libc::SIGKILL);
            }
            #[cfg(windows)]
            {
                let _ = std::process::Command::new("taskkill")
                    .args(&["/PID", &pid.to_string(), "/T", "/F"])
                    .output();
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
        engine: Engine,
        app_handle: tauri::AppHandle,
    ) -> Result<Self, String> {
        let adapter = adapters::create_adapter(&engine);
        let binary_path = adapter.resolve_binary()?;
        let args = adapter.build_args(
            &session_id,
            model.as_deref(),
            &permission_mode,
        );

        let mut cmd = Command::new(&binary_path);
        cmd.args(&args);

        cmd.current_dir(&cwd)
            .stdin(std::process::Stdio::piped())
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped());

        // Create process group on Unix for reliable cleanup
        #[cfg(unix)]
        unsafe {
            cmd.pre_exec(|| {
                libc::setpgid(0, 0);
                Ok(())
            });
        }

        let mut child = cmd
            .spawn()
            .map_err(|e| format!("Failed to spawn {} CLI: {}", engine, e))?;

        let stdout = child.stdout.take().ok_or("Failed to capture stdout")?;
        let stderr = child.stderr.take().ok_or("Failed to capture stderr")?;
        let stdin = child.stdin.take().ok_or("Failed to capture stdin")?;

        // Track PID for reliable cleanup on app exit
        if let Some(pid) = child.id() {
            register_pid(pid);
        }

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

        // Stdout reader task — uses adapter to parse output
        let aid = agent_id.clone();
        let handle = app_handle.clone();
        let suppress_exit_clone = suppress_exit.clone();
        let spawned_pid = child.id();
        let stdout_adapter = adapters::create_adapter(&engine);
        tokio::spawn(async move {
            let reader = BufReader::new(stdout);
            let mut lines = reader.lines();
            while let Ok(Some(line)) = lines.next_line().await {
                let event = stdout_adapter.parse_stdout_line(&line);

                match event {
                    ParsedEvent::RawMessage { json } => {
                        // Emit the message to frontend
                        let _ = handle.emit(
                            "agent-message",
                            AgentMessage {
                                agent_id: aid.clone(),
                                message: json.clone(),
                            },
                        );

                        // Detect status from message type
                        let msg_type =
                            json.get("type").and_then(|v| v.as_str()).unwrap_or("");
                        let subtype =
                            json.get("subtype").and_then(|v| v.as_str()).unwrap_or("");

                        let new_status = match msg_type {
                            "system" if subtype == "init" => {
                                Some(AgentStatus::AwaitingInput)
                            }
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
                            if (status == AgentStatus::AwaitingInput
                                || status == AgentStatus::Errored)
                                && msg_type == "result"
                            {
                                let reason = if status == AgentStatus::Errored {
                                    "errored"
                                } else {
                                    "completed"
                                };
                                let _ = handle.emit(
                                    "agent-entered-queue",
                                    QueueEntry {
                                        agent_id: aid.clone(),
                                        agent_name: String::new(),
                                        reason: reason.to_string(),
                                    },
                                );
                            }
                        }
                    }
                    ParsedEvent::AskUser { question } => {
                        // Wrap as a system message so frontend shows it
                        let msg = serde_json::json!({
                            "type": "assistant",
                            "message": {
                                "content": [{
                                    "type": "text",
                                    "text": format!("**Approval needed:** {}", question),
                                }]
                            }
                        });
                        let _ = handle.emit(
                            "agent-message",
                            AgentMessage {
                                agent_id: aid.clone(),
                                message: msg,
                            },
                        );
                        let _ = handle.emit(
                            "agent-status-changed",
                            StatusChange {
                                agent_id: aid.clone(),
                                status: AgentStatus::AwaitingInput,
                            },
                        );
                        let _ = handle.emit(
                            "agent-entered-queue",
                            QueueEntry {
                                agent_id: aid.clone(),
                                agent_name: String::new(),
                                reason: "needs_approval".to_string(),
                            },
                        );
                    }
                    ParsedEvent::DiffProposal { diff } => {
                        let msg = serde_json::json!({
                            "type": "assistant",
                            "message": {
                                "content": [{
                                    "type": "text",
                                    "text": format!("```diff\n{}\n```", diff),
                                }]
                            }
                        });
                        let _ = handle.emit(
                            "agent-message",
                            AgentMessage {
                                agent_id: aid.clone(),
                                message: msg,
                            },
                        );
                    }
                    ParsedEvent::Compacting => {
                        let msg = serde_json::json!({
                            "type": "system",
                            "subtype": "compact",
                        });
                        let _ = handle.emit(
                            "agent-message",
                            AgentMessage {
                                agent_id: aid.clone(),
                                message: msg,
                            },
                        );
                    }
                    ParsedEvent::Text { text } => {
                        // Wrap as assistant text
                        let msg = serde_json::json!({
                            "type": "assistant",
                            "message": {
                                "content": [{"type": "text", "text": text}]
                            }
                        });
                        let _ = handle.emit(
                            "agent-message",
                            AgentMessage {
                                agent_id: aid.clone(),
                                message: msg,
                            },
                        );
                    }
                    ParsedEvent::Ignore => {}
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
        let stderr_adapter = adapters::create_adapter(&engine);
        tokio::spawn(async move {
            let reader = BufReader::new(stderr);
            let mut lines = reader.lines();
            while let Ok(Some(line)) = lines.next_line().await {
                let event = stderr_adapter.parse_stderr_line(&line);
                match event {
                    ParsedEvent::Compacting => {
                        let msg = serde_json::json!({
                            "type": "system",
                            "subtype": "compact",
                        });
                        let _ = handle2.emit(
                            "agent-message",
                            AgentMessage {
                                agent_id: aid2.clone(),
                                message: msg,
                            },
                        );
                    }
                    _ => {
                        let text = match event {
                            ParsedEvent::Text { text } => text,
                            _ => line.clone(),
                        };
                        let _ = handle2.emit(
                            "agent-stderr",
                            StderrLine {
                                agent_id: aid2.clone(),
                                line: text,
                            },
                        );
                    }
                }
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

    pub async fn send(&self, text: &str, engine: &Engine) -> Result<(), String> {
        let adapter = adapters::create_adapter(engine);
        let formatted = adapter.format_user_prompt(text);
        self.stdin_tx
            .send(formatted)
            .await
            .map_err(|e| format!("Failed to send to stdin: {}", e))
    }

    /// Send a graceful shutdown signal. Allows the process to save session state.
    pub fn terminate(&self) {
        if let Some(pid) = self.child.id() {
            #[cfg(unix)]
            unsafe {
                libc::kill(pid as i32, libc::SIGTERM);
            }
            #[cfg(windows)]
            {
                let _ = std::process::Command::new("taskkill")
                    .args(&["/PID", &pid.to_string(), "/T"])
                    .output();
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

    #[allow(dead_code)]
    pub fn pid(&self) -> Option<u32> {
        self.child.id()
    }
}
