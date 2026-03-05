use std::path::PathBuf;

use super::{CliAdapter, ParsedEvent};
use crate::agent::state::{AgentConfig, Engine};

/// Adapter for the Claude Code CLI (`claude` binary).
///
/// Claude outputs structured NDJSON via `--output-format stream-json`.
/// Input is also JSON via `--input-format stream-json`.
pub struct ClaudeAdapter;

impl ClaudeAdapter {
    /// Resolve the `claude` binary path.
    /// App bundles may not inherit the user's shell PATH, so we search common locations.
    fn find_binary() -> Result<PathBuf, String> {
        // Try PATH first (works when launched from terminal / tauri dev)
        if let Ok(path) = which::which("claude") {
            return Ok(path);
        }

        #[cfg(unix)]
        {
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

        #[cfg(windows)]
        {
            let userprofile = std::env::var("USERPROFILE").unwrap_or_default();
            let localappdata = std::env::var("LOCALAPPDATA").unwrap_or_default();
            let candidates = [
                format!("{}\\.claude\\bin\\claude.exe", userprofile),
                format!("{}\\Programs\\claude-code\\claude.exe", localappdata),
                format!("{}\\Microsoft\\WinGet\\Links\\claude.exe", localappdata),
            ];

            for candidate in &candidates {
                let path = PathBuf::from(candidate);
                if path.exists() {
                    return Ok(path);
                }
            }

            Err("Could not find 'claude' binary. Searched PATH and common locations. Is Claude Code installed?".to_string())
        }
    }
}

impl CliAdapter for ClaudeAdapter {
    fn engine(&self) -> Engine {
        Engine::Claude
    }

    fn resolve_binary(&self) -> Result<PathBuf, String> {
        Self::find_binary()
    }

    fn build_args(&self, session_id: &str, config: &AgentConfig) -> Vec<String> {
        let permission_mode = &config.permission_mode;
        let mut args = vec![
            "-p".to_string(),
            "--output-format".to_string(),
            "stream-json".to_string(),
            "--input-format".to_string(),
            "stream-json".to_string(),
            "--verbose".to_string(),
            "--session-id".to_string(),
            session_id.to_string(),
        ];

        if permission_mode == "dangerouslySkipPermissions" {
            args.push("--dangerously-skip-permissions".to_string());
        } else {
            args.push("--permission-mode".to_string());
            args.push(permission_mode.to_string());
        }

        // AskUserQuestion gets auto-answered with a useless default in -p mode.
        // Disable it so Claude asks questions as text instead.
        if permission_mode == "bypassPermissions" || permission_mode == "dangerouslySkipPermissions"
        {
            args.push("--disallowed-tools".to_string());
            args.push("AskUserQuestion".to_string());
        }

        if let Some(m) = &config.model {
            args.push("--model".to_string());
            args.push(m.to_string());
        }

        // Extended config flags
        if let Some(ref sp) = config.append_system_prompt {
            args.push("--append-system-prompt".to_string());
            args.push(sp.clone());
        }

        if let Some(mt) = config.max_turns {
            args.push("--max-turns".to_string());
            args.push(mt.to_string());
        }

        if let Some(mb) = config.max_budget_usd {
            args.push("--max-budget-usd".to_string());
            args.push(format!("{:.2}", mb));
        }

        if let Some(ref tools) = config.allowed_tools {
            for tool in tools {
                args.push("--allowedTools".to_string());
                args.push(tool.clone());
            }
        }

        if let Some(ref tools) = config.disallowed_tools {
            for tool in tools {
                args.push("--disallowed-tools".to_string());
                args.push(tool.clone());
            }
        }

        if let Some(ref dirs) = config.additional_dirs {
            for dir in dirs {
                args.push("--add-dir".to_string());
                args.push(dir.clone());
            }
        }

        args
    }

    fn parse_stdout_line(&self, line: &str) -> ParsedEvent {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            return ParsedEvent::Ignore;
        }

        match serde_json::from_str::<serde_json::Value>(trimmed) {
            Ok(json) => ParsedEvent::RawMessage { json },
            Err(_) => {
                // Non-JSON output from Claude (rare but possible)
                if trimmed.contains("Compacting context") {
                    ParsedEvent::Compacting
                } else {
                    ParsedEvent::Text {
                        text: trimmed.to_string(),
                    }
                }
            }
        }
    }

    fn parse_stderr_line(&self, line: &str) -> ParsedEvent {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            return ParsedEvent::Ignore;
        }
        if trimmed.contains("Compacting context") || trimmed.contains("compacting") {
            return ParsedEvent::Compacting;
        }
        ParsedEvent::Text {
            text: trimmed.to_string(),
        }
    }

    fn format_user_prompt(&self, text: &str) -> String {
        let msg = serde_json::json!({
            "type": "user",
            "message": {
                "role": "user",
                "content": [{"type": "text", "text": text}]
            }
        });
        msg.to_string()
    }

    fn format_approval(&self, approved: bool) -> String {
        let text = if approved {
            "Yes, proceed."
        } else {
            "No, do not proceed."
        };
        self.format_user_prompt(text)
    }

    fn supports_sessions(&self) -> bool {
        true
    }

    fn is_json_output(&self) -> bool {
        true
    }
}
