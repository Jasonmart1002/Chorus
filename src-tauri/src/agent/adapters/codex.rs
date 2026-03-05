use std::path::PathBuf;

use super::{CliAdapter, ParsedEvent};
use crate::agent::state::{AgentConfig, Engine};

/// Adapter for the OpenAI Codex CLI (`codex` binary).
///
/// Codex outputs ANSI-formatted text (not structured JSON).
/// We parse key patterns like approval prompts and diff proposals.
pub struct CodexAdapter;

impl CodexAdapter {
    fn find_binary() -> Result<PathBuf, String> {
        // Try PATH first
        if let Ok(path) = which::which("codex") {
            return Ok(path);
        }

        #[cfg(unix)]
        {
            let home = std::env::var("HOME").unwrap_or_default();
            let candidates = [
                format!("{}/.local/bin/codex", home),
                format!("{}/.codex/bin/codex", home),
                "/usr/local/bin/codex".to_string(),
            ];

            for candidate in &candidates {
                let path = PathBuf::from(candidate);
                if path.exists() {
                    return Ok(path);
                }
            }

            // Also check npm global bin
            if let Ok(output) = std::process::Command::new("npm")
                .args(["root", "-g"])
                .output()
            {
                let npm_root = String::from_utf8_lossy(&output.stdout).trim().to_string();
                if !npm_root.is_empty() {
                    let npm_bin = PathBuf::from(&npm_root)
                        .parent()
                        .map(|p| p.join("bin/codex"));
                    if let Some(p) = npm_bin {
                        if p.exists() {
                            return Ok(p);
                        }
                    }
                }
            }

            Err("Could not find 'codex' binary. Searched PATH and common locations. Is OpenAI Codex CLI installed? Install with: npm install -g @openai/codex".to_string())
        }

        #[cfg(windows)]
        {
            let userprofile = std::env::var("USERPROFILE").unwrap_or_default();
            let appdata = std::env::var("APPDATA").unwrap_or_default();
            let candidates = [
                format!("{}\\.codex\\bin\\codex.exe", userprofile),
                format!("{}\\npm\\codex.cmd", appdata),
            ];

            for candidate in &candidates {
                let path = PathBuf::from(candidate);
                if path.exists() {
                    return Ok(path);
                }
            }

            Err("Could not find 'codex' binary. Is OpenAI Codex CLI installed? Install with: npm install -g @openai/codex".to_string())
        }
    }

    /// Strip ANSI escape codes from a string
    fn strip_ansi(s: &str) -> String {
        // Simple regex-free ANSI stripping: remove ESC[...m sequences
        let mut result = String::with_capacity(s.len());
        let mut chars = s.chars().peekable();
        while let Some(c) = chars.next() {
            if c == '\x1b' {
                // Skip until 'm' or end of sequence
                if chars.peek() == Some(&'[') {
                    chars.next(); // consume '['
                    while let Some(&next) = chars.peek() {
                        chars.next();
                        // Most ANSI sequences end with a letter.
                        if next.is_ascii_alphabetic() {
                            break;
                        }
                    }
                }
            } else {
                result.push(c);
            }
        }
        result
    }
}

impl CliAdapter for CodexAdapter {
    fn engine(&self) -> Engine {
        Engine::Codex
    }

    fn resolve_binary(&self) -> Result<PathBuf, String> {
        Self::find_binary()
    }

    fn build_args(&self, _session_id: &str, config: &AgentConfig) -> Vec<String> {
        let mut args = vec![];

        // Map our permission modes to Codex modes
        let mode = match config.permission_mode.as_str() {
            "bypassPermissions" => "full-auto",
            "plan" => "suggest",
            _ => "suggest", // default to suggest (safest)
        };

        args.push("--approval-mode".to_string());
        args.push(mode.to_string());

        // Use quiet mode for cleaner output
        args.push("--quiet".to_string());

        if let Some(m) = &config.model {
            args.push("--model".to_string());
            args.push(m.to_string());
        }

        args
    }

    fn parse_stdout_line(&self, line: &str) -> ParsedEvent {
        let cleaned = Self::strip_ansi(line);
        let trimmed = cleaned.trim();

        if trimmed.is_empty() {
            return ParsedEvent::Ignore;
        }

        // Try parsing as JSON first (codex may output JSON in some modes)
        if trimmed.starts_with('{') {
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(trimmed) {
                return ParsedEvent::RawMessage { json };
            }
        }

        // Detect approval prompts
        let lower = trimmed.to_lowercase();
        if lower.contains("apply changes?")
            || lower.contains("[y/n]")
            || lower.contains("approve?")
            || lower.contains("do you want to")
        {
            return ParsedEvent::AskUser {
                question: trimmed.to_string(),
            };
        }

        // Detect diff output
        if trimmed.starts_with("--- ") || trimmed.starts_with("+++ ") || trimmed.starts_with("@@") {
            return ParsedEvent::DiffProposal {
                diff: trimmed.to_string(),
            };
        }

        // Detect compaction
        if lower.contains("compacting") || lower.contains("compact") {
            return ParsedEvent::Compacting;
        }

        // Regular text output — wrap as a Claude-compatible assistant message
        // so the frontend can render it uniformly
        let json = serde_json::json!({
            "type": "assistant",
            "message": {
                "content": [{"type": "text", "text": trimmed}]
            }
        });
        ParsedEvent::RawMessage { json }
    }

    fn parse_stderr_line(&self, line: &str) -> ParsedEvent {
        let cleaned = Self::strip_ansi(line);
        let trimmed = cleaned.trim();
        if trimmed.is_empty() {
            return ParsedEvent::Ignore;
        }
        ParsedEvent::Text {
            text: trimmed.to_string(),
        }
    }

    fn format_user_prompt(&self, text: &str) -> String {
        // Codex accepts plain text on stdin
        text.to_string()
    }

    fn format_approval(&self, approved: bool) -> String {
        if approved {
            "y".to_string()
        } else {
            "n".to_string()
        }
    }

    fn supports_sessions(&self) -> bool {
        false // Codex doesn't have session resume
    }

    fn is_json_output(&self) -> bool {
        false // Codex outputs ANSI text
    }
}
