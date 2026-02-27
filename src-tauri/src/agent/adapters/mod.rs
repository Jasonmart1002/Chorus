pub mod claude;
pub mod codex;
pub mod gemini;

use std::path::PathBuf;

use super::state::Engine;

/// Result of parsing one line of stdout/stderr from a CLI process.
/// Each variant maps to something the frontend needs to know about.
#[derive(Debug, Clone, serde::Serialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum ParsedEvent {
    /// Raw SDK message (JSON passthrough for engines that output structured data)
    RawMessage { json: serde_json::Value },
    /// The agent is producing text output (for ANSI-based engines)
    Text { text: String },
    /// The agent is asking the user a question (approval gate / interactive pause)
    AskUser { question: String },
    /// The agent is proposing a diff for review
    DiffProposal { diff: String },
    /// Context is being compacted / compressed
    Compacting,
    /// Ignore this line (noise, empty, etc.)
    Ignore,
}

/// Describes how to interact with a specific CLI engine.
/// Each adapter knows how to resolve its binary, build spawn arguments,
/// parse output lines, and format input messages.
pub trait CliAdapter: Send + Sync {
    /// Human-readable engine name
    fn engine(&self) -> Engine;

    /// Resolve the CLI binary path, searching PATH and common locations
    fn resolve_binary(&self) -> Result<PathBuf, String>;

    /// Build the command-line arguments for spawning the CLI process
    fn build_args(
        &self,
        session_id: &str,
        model: Option<&str>,
        permission_mode: &str,
    ) -> Vec<String>;

    /// Parse a single line of stdout. Returns events for the frontend.
    fn parse_stdout_line(&self, line: &str) -> ParsedEvent;

    /// Parse a single line of stderr. Returns events for the frontend.
    fn parse_stderr_line(&self, line: &str) -> ParsedEvent;

    /// Format a user prompt into bytes to send to stdin
    fn format_user_prompt(&self, text: &str) -> String;

    /// Format an approval response (y/n) into bytes to send to stdin
    fn format_approval(&self, approved: bool) -> String;

    /// Whether this engine supports session resume via session-id
    fn supports_sessions(&self) -> bool;

    /// Whether stdout output is structured JSON (true) or ANSI text (false)
    fn is_json_output(&self) -> bool;
}

/// Create the appropriate adapter for a given engine
pub fn create_adapter(engine: &Engine) -> Box<dyn CliAdapter> {
    match engine {
        Engine::Claude => Box::new(claude::ClaudeAdapter),
        Engine::Codex => Box::new(codex::CodexAdapter),
        Engine::Gemini => Box::new(gemini::GeminiAdapter),
    }
}

/// Check which CLI engines are available on this system
pub fn detect_engines() -> Vec<EngineInfo> {
    let engines = [Engine::Claude, Engine::Codex, Engine::Gemini];
    engines
        .iter()
        .map(|e| {
            let adapter = create_adapter(e);
            let (available, path) = match adapter.resolve_binary() {
                Ok(p) => (true, Some(p.to_string_lossy().to_string())),
                Err(_) => (false, None),
            };
            EngineInfo {
                engine: e.clone(),
                available,
                binary_path: path,
            }
        })
        .collect()
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct EngineInfo {
    pub engine: Engine,
    pub available: bool,
    pub binary_path: Option<String>,
}
