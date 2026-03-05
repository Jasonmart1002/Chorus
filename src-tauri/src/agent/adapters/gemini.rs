use std::path::PathBuf;

use super::{CliAdapter, ParsedEvent};
use crate::agent::state::{AgentConfig, Engine};

/// Adapter for the Gemini CLI (`gemini` binary).
///
/// Gemini supports `--output-format stream-json` for structured JSON output,
/// making it the cleanest engine to wrap programmatically.
pub struct GeminiAdapter;

impl GeminiAdapter {
    fn find_binary() -> Result<PathBuf, String> {
        // Try PATH first
        if let Ok(path) = which::which("gemini") {
            return Ok(path);
        }

        #[cfg(unix)]
        {
            let home = std::env::var("HOME").unwrap_or_default();
            let candidates = [
                format!("{}/.local/bin/gemini", home),
                format!("{}/.gemini/bin/gemini", home),
                "/usr/local/bin/gemini".to_string(),
            ];

            for candidate in &candidates {
                let path = PathBuf::from(candidate);
                if path.exists() {
                    return Ok(path);
                }
            }

            // Check npm global bin
            if let Ok(output) = std::process::Command::new("npm")
                .args(["root", "-g"])
                .output()
            {
                let npm_root = String::from_utf8_lossy(&output.stdout).trim().to_string();
                if !npm_root.is_empty() {
                    let npm_bin = PathBuf::from(&npm_root)
                        .parent()
                        .map(|p| p.join("bin/gemini"));
                    if let Some(p) = npm_bin {
                        if p.exists() {
                            return Ok(p);
                        }
                    }
                }
            }

            Err("Could not find 'gemini' binary. Searched PATH and common locations. Is Gemini CLI installed? Install with: npm install -g @anthropic-ai/gemini-cli or see https://github.com/anthropics/gemini-cli".to_string())
        }

        #[cfg(windows)]
        {
            let userprofile = std::env::var("USERPROFILE").unwrap_or_default();
            let appdata = std::env::var("APPDATA").unwrap_or_default();
            let candidates = [
                format!("{}\\.gemini\\bin\\gemini.exe", userprofile),
                format!("{}\\npm\\gemini.cmd", appdata),
            ];

            for candidate in &candidates {
                let path = PathBuf::from(candidate);
                if path.exists() {
                    return Ok(path);
                }
            }

            Err("Could not find 'gemini' binary. Is Gemini CLI installed?".to_string())
        }
    }
}

impl CliAdapter for GeminiAdapter {
    fn engine(&self) -> Engine {
        Engine::Gemini
    }

    fn resolve_binary(&self) -> Result<PathBuf, String> {
        Self::find_binary()
    }

    fn build_args(&self, _session_id: &str, config: &AgentConfig) -> Vec<String> {
        let mut args = vec!["--output-format".to_string(), "stream-json".to_string()];

        if let Some(m) = &config.model {
            args.push("--model".to_string());
            args.push(m.to_string());
        }

        args
    }

    fn parse_stdout_line(&self, line: &str) -> ParsedEvent {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            return ParsedEvent::Ignore;
        }

        // Gemini outputs structured JSON events
        if let Ok(json) = serde_json::from_str::<serde_json::Value>(trimmed) {
            // Check for Gemini-specific event types and normalize to Claude format
            let event_type = json.get("type").and_then(|v| v.as_str()).unwrap_or("");

            match event_type {
                // Gemini tool_call events that need approval
                "tool_call" => {
                    let needs_approval = json
                        .get("requires_approval")
                        .and_then(|v| v.as_bool())
                        .unwrap_or(false);
                    if needs_approval {
                        let desc = json
                            .get("description")
                            .and_then(|v| v.as_str())
                            .unwrap_or("Approve action?");
                        return ParsedEvent::AskUser {
                            question: desc.to_string(),
                        };
                    }
                    // Normalize tool_call to Claude-compatible format
                    let tool_name = json
                        .get("name")
                        .and_then(|v| v.as_str())
                        .unwrap_or("unknown");
                    let tool_input = json.get("arguments").cloned().unwrap_or_default();
                    let tool_id = json
                        .get("id")
                        .and_then(|v| v.as_str())
                        .unwrap_or("gemini-tool");
                    let normalized = serde_json::json!({
                        "type": "assistant",
                        "message": {
                            "content": [{
                                "type": "tool_use",
                                "id": tool_id,
                                "name": tool_name,
                                "input": tool_input,
                            }]
                        }
                    });
                    return ParsedEvent::RawMessage { json: normalized };
                }

                // Text delta events — normalize to assistant message
                "text_delta" | "content" => {
                    let text = json
                        .get("text")
                        .or_else(|| json.get("content"))
                        .and_then(|v| v.as_str())
                        .unwrap_or("");
                    if text.is_empty() {
                        return ParsedEvent::Ignore;
                    }
                    let normalized = serde_json::json!({
                        "type": "assistant",
                        "message": {
                            "content": [{"type": "text", "text": text}]
                        }
                    });
                    return ParsedEvent::RawMessage { json: normalized };
                }

                // Result/completion events — normalize to result message
                "result" | "done" | "turn_complete" => {
                    let result_text = json
                        .get("result")
                        .or_else(|| json.get("text"))
                        .and_then(|v| v.as_str())
                        .unwrap_or("");
                    let is_error = json.get("error").and_then(|v| v.as_bool()).unwrap_or(false);
                    let normalized = serde_json::json!({
                        "type": "result",
                        "subtype": if is_error { "error_tool_use" } else { "success" },
                        "result": result_text,
                    });
                    return ParsedEvent::RawMessage { json: normalized };
                }

                // Session/init events — normalize to system init
                "session_start" | "init" => {
                    let session_id = json
                        .get("session_id")
                        .and_then(|v| v.as_str())
                        .unwrap_or("");
                    let normalized = serde_json::json!({
                        "type": "system",
                        "subtype": "init",
                        "session_id": session_id,
                        "tools": [],
                    });
                    return ParsedEvent::RawMessage { json: normalized };
                }

                // Compression events
                "compress" | "compact" => {
                    return ParsedEvent::Compacting;
                }

                _ => {}
            }

            // Pass through any unrecognized JSON as raw message
            // Try to normalize if it looks like a text response
            if let Some(text) = json.get("text").and_then(|v| v.as_str()) {
                if !text.is_empty() {
                    let normalized = serde_json::json!({
                        "type": "assistant",
                        "message": {
                            "content": [{"type": "text", "text": text}]
                        }
                    });
                    return ParsedEvent::RawMessage { json: normalized };
                }
            }

            ParsedEvent::RawMessage { json }
        } else {
            // Fallback: non-JSON text from Gemini
            let lower = trimmed.to_lowercase();
            if lower.contains("compress") || lower.contains("compact") {
                return ParsedEvent::Compacting;
            }
            let json = serde_json::json!({
                "type": "assistant",
                "message": {
                    "content": [{"type": "text", "text": trimmed}]
                }
            });
            ParsedEvent::RawMessage { json }
        }
    }

    fn parse_stderr_line(&self, line: &str) -> ParsedEvent {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            return ParsedEvent::Ignore;
        }
        ParsedEvent::Text {
            text: trimmed.to_string(),
        }
    }

    fn format_user_prompt(&self, text: &str) -> String {
        // Gemini accepts plain text prompts on stdin
        text.to_string()
    }

    fn format_approval(&self, approved: bool) -> String {
        if approved {
            "yes".to_string()
        } else {
            "no".to_string()
        }
    }

    fn supports_sessions(&self) -> bool {
        false // Gemini uses checkpointing, not session IDs
    }

    fn is_json_output(&self) -> bool {
        true
    }
}
