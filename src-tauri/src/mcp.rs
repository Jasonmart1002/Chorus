use std::path::PathBuf;

/// Find the `claude` binary (same logic as the Claude adapter).
fn find_claude_binary() -> Result<PathBuf, String> {
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
    }

    Err("Could not find 'claude' binary".to_string())
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct McpServer {
    pub name: String,
    #[serde(default)]
    pub transport: String,
    #[serde(default)]
    pub command: String,
    #[serde(default)]
    pub args: Vec<String>,
    #[serde(default)]
    pub scope: String,
    #[serde(default)]
    pub env: std::collections::HashMap<String, String>,
}

#[tauri::command]
pub async fn mcp_list() -> Result<Vec<McpServer>, String> {
    let binary = find_claude_binary()?;

    let output = tokio::process::Command::new(&binary)
        .args(["mcp", "list"])
        .output()
        .await
        .map_err(|e| format!("Failed to run claude mcp list: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();

    // Try parsing as JSON first
    if let Ok(servers) = serde_json::from_str::<Vec<McpServer>>(&stdout) {
        return Ok(servers);
    }

    // Parse text output: "name: command args... (scope)"
    let mut servers = Vec::new();
    for line in stdout.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with("No MCP") {
            continue;
        }
        // Format: "  name: transport command args (scope)" or similar
        // Try to extract name at minimum
        if let Some((name_part, rest)) = trimmed.split_once(':') {
            let name = name_part.trim().to_string();
            let rest = rest.trim();
            let (command, scope) = if let Some(idx) = rest.rfind('(') {
                let scope = rest.get(idx + 1..).unwrap_or("").trim_end_matches(')').trim().to_string();
                let cmd = rest.get(..idx).unwrap_or("").trim().to_string();
                (cmd, scope)
            } else {
                (rest.to_string(), "user".to_string())
            };
            servers.push(McpServer {
                name,
                transport: if command.starts_with("http") { "sse".to_string() } else { "stdio".to_string() },
                command,
                args: Vec::new(),
                scope,
                env: std::collections::HashMap::new(),
            });
        }
    }

    Ok(servers)
}

#[tauri::command]
pub async fn mcp_add(
    name: String,
    transport: String,
    command_or_url: String,
    args: Vec<String>,
    env: std::collections::HashMap<String, String>,
    scope: String,
) -> Result<(), String> {
    let binary = find_claude_binary()?;

    let mut cmd_args = vec![
        "mcp".to_string(),
        "add".to_string(),
    ];

    // Add scope flag
    match scope.as_str() {
        "project" => cmd_args.push("--scope=project".to_string()),
        _ => cmd_args.push("--scope=user".to_string()),
    }

    // Add transport
    if transport == "sse" || transport == "http" {
        cmd_args.push("--transport=sse".to_string());
    }

    // Server name
    cmd_args.push(name);

    // Command or URL
    cmd_args.push(command_or_url);

    // Additional args
    for arg in &args {
        cmd_args.push(arg.clone());
    }

    // Environment variables
    for (key, value) in &env {
        cmd_args.push("--env".to_string());
        cmd_args.push(format!("{}={}", key, value));
    }

    let output = tokio::process::Command::new(&binary)
        .args(&cmd_args)
        .output()
        .await
        .map_err(|e| format!("Failed to run claude mcp add: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Failed to add MCP server: {}", stderr));
    }

    Ok(())
}

#[tauri::command]
pub async fn mcp_remove(name: String, scope: String) -> Result<(), String> {
    let binary = find_claude_binary()?;

    let scope_flag = match scope.as_str() {
        "project" => "--scope=project",
        _ => "--scope=user",
    };

    let output = tokio::process::Command::new(&binary)
        .args(["mcp", "remove", scope_flag, &name])
        .output()
        .await
        .map_err(|e| format!("Failed to run claude mcp remove: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Failed to remove MCP server: {}", stderr));
    }

    Ok(())
}
