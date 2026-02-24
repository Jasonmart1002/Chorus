use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize)]
pub struct SkillInfo {
    pub name: String,
    pub description: String,
    pub file_path: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct CommandInfo {
    pub name: String,
    pub description: String,
    pub argument_hint: Option<String>,
    pub allowed_tools: Vec<String>,
    pub file_path: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct PluginAuthor {
    pub name: String,
    pub email: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct PluginInfo {
    pub id: String,
    pub name: String,
    pub version: String,
    pub description: String,
    pub author: Option<PluginAuthor>,
    pub enabled: bool,
    pub install_path: String,
    pub installed_at: Option<String>,
    pub last_updated: Option<String>,
    pub skills: Vec<SkillInfo>,
    pub commands: Vec<CommandInfo>,
}

#[derive(Debug, Clone, Serialize)]
pub struct SkillsData {
    pub plugins: Vec<PluginInfo>,
    pub total_skills: usize,
    pub total_commands: usize,
}

fn claude_dir() -> Option<PathBuf> {
    #[cfg(unix)]
    {
        std::env::var("HOME")
            .ok()
            .map(|h| PathBuf::from(h).join(".claude"))
    }
    #[cfg(windows)]
    {
        std::env::var("APPDATA")
            .ok()
            .map(|a| PathBuf::from(a).join("Claude"))
    }
}

/// Parse YAML frontmatter from a markdown file.
/// Returns (frontmatter_map, body_after_frontmatter).
fn parse_frontmatter(content: &str) -> (serde_yaml::Value, String) {
    let trimmed = content.trim_start();
    if !trimmed.starts_with("---") {
        return (serde_yaml::Value::Mapping(Default::default()), content.to_string());
    }

    // Find the closing ---
    let after_first = &trimmed[3..];
    if let Some(end_idx) = after_first.find("\n---") {
        let yaml_str = &after_first[..end_idx];
        let body_start = end_idx + 4; // skip past \n---
        let body = after_first[body_start..].trim_start_matches('\n').to_string();
        let frontmatter: serde_yaml::Value =
            serde_yaml::from_str(yaml_str).unwrap_or(serde_yaml::Value::Mapping(Default::default()));
        (frontmatter, body)
    } else {
        (serde_yaml::Value::Mapping(Default::default()), content.to_string())
    }
}

fn yaml_str(val: &serde_yaml::Value, key: &str) -> Option<String> {
    val.get(key).and_then(|v| v.as_str()).map(|s| s.to_string())
}

fn yaml_str_vec(val: &serde_yaml::Value, key: &str) -> Vec<String> {
    val.get(key)
        .and_then(|v| v.as_sequence())
        .map(|seq| {
            seq.iter()
                .filter_map(|item| item.as_str().map(|s| s.to_string()))
                .collect()
        })
        .unwrap_or_default()
}

/// Scan a plugin directory for skills (skills/{name}/SKILL.md).
fn scan_skills(plugin_path: &Path) -> Vec<SkillInfo> {
    let skills_dir = plugin_path.join("skills");
    let mut skills = Vec::new();

    if let Ok(entries) = fs::read_dir(&skills_dir) {
        for entry in entries.flatten() {
            if entry.file_type().map(|t| t.is_dir()).unwrap_or(false) {
                let skill_md = entry.path().join("SKILL.md");
                if skill_md.exists() {
                    if let Ok(content) = fs::read_to_string(&skill_md) {
                        let (fm, _body) = parse_frontmatter(&content);
                        let name = yaml_str(&fm, "name")
                            .unwrap_or_else(|| {
                                entry.file_name().to_string_lossy().to_string()
                            });
                        let description = yaml_str(&fm, "description").unwrap_or_default();
                        skills.push(SkillInfo {
                            name,
                            description,
                            file_path: skill_md.to_string_lossy().to_string(),
                        });
                    }
                }
            }
        }
    }

    skills
}

/// Scan a plugin directory for commands (commands/{name}.md).
fn scan_commands(plugin_path: &Path) -> Vec<CommandInfo> {
    let commands_dir = plugin_path.join("commands");
    let mut commands = Vec::new();

    if let Ok(entries) = fs::read_dir(&commands_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().map(|e| e == "md").unwrap_or(false) {
                if let Ok(content) = fs::read_to_string(&path) {
                    let (fm, _body) = parse_frontmatter(&content);
                    let name = path
                        .file_stem()
                        .map(|s| s.to_string_lossy().to_string())
                        .unwrap_or_default();
                    let description = yaml_str(&fm, "description").unwrap_or_default();
                    let argument_hint = yaml_str(&fm, "argument-hint");
                    let allowed_tools = yaml_str_vec(&fm, "allowed-tools");
                    commands.push(CommandInfo {
                        name,
                        description,
                        argument_hint,
                        allowed_tools,
                        file_path: path.to_string_lossy().to_string(),
                    });
                }
            }
        }
    }

    commands
}

/// Read plugin metadata from .claude-plugin/plugin.json.
fn read_plugin_metadata(plugin_path: &Path) -> (String, String, String, Option<PluginAuthor>) {
    let meta_path = plugin_path.join(".claude-plugin").join("plugin.json");
    if let Ok(content) = fs::read_to_string(&meta_path) {
        if let Ok(val) = serde_json::from_str::<serde_json::Value>(&content) {
            let name = val.get("name").and_then(|v| v.as_str()).unwrap_or("Unknown").to_string();
            let version = val.get("version").and_then(|v| v.as_str()).unwrap_or("0.0.0").to_string();
            let description = val.get("description").and_then(|v| v.as_str()).unwrap_or("").to_string();
            let author = val.get("author").and_then(|a| {
                let author_name = a.get("name").and_then(|v| v.as_str())?.to_string();
                let email = a.get("email").and_then(|v| v.as_str()).map(|s| s.to_string());
                Some(PluginAuthor { name: author_name, email })
            });
            return (name, version, description, author);
        }
    }
    ("Unknown".to_string(), "0.0.0".to_string(), String::new(), None)
}

fn get_skills_data() -> Result<SkillsData, String> {
    let claude = claude_dir().ok_or("Could not determine home directory")?;
    let plugins_dir = claude.join("plugins");

    // Read installed_plugins.json
    let installed_path = plugins_dir.join("installed_plugins.json");
    let installed: serde_json::Value = if installed_path.exists() {
        let content = fs::read_to_string(&installed_path)
            .map_err(|e| format!("Failed to read installed_plugins.json: {}", e))?;
        serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse installed_plugins.json: {}", e))?
    } else {
        serde_json::json!({ "plugins": {} })
    };

    // Read settings.json for enabled plugins
    let settings_path = claude.join("settings.json");
    let enabled_plugins: std::collections::HashMap<String, bool> = if settings_path.exists() {
        let content = fs::read_to_string(&settings_path).unwrap_or_default();
        let val: serde_json::Value = serde_json::from_str(&content).unwrap_or_default();
        val.get("enabledPlugins")
            .and_then(|v| serde_json::from_value(v.clone()).ok())
            .unwrap_or_default()
    } else {
        std::collections::HashMap::new()
    };

    let mut plugins = Vec::new();

    if let Some(plugins_map) = installed.get("plugins").and_then(|v| v.as_object()) {
        for (plugin_id, entries) in plugins_map {
            // Each plugin has an array of installations; take the first
            let entry = entries
                .as_array()
                .and_then(|arr| arr.first());

            let entry = match entry {
                Some(e) => e,
                None => continue,
            };

            let install_path_str = entry
                .get("installPath")
                .and_then(|v| v.as_str())
                .unwrap_or("");

            if install_path_str.is_empty() {
                continue;
            }

            let install_path = PathBuf::from(install_path_str);
            let enabled = enabled_plugins.get(plugin_id).copied().unwrap_or(false);
            let installed_at = entry.get("installedAt").and_then(|v| v.as_str()).map(|s| s.to_string());
            let last_updated = entry.get("lastUpdated").and_then(|v| v.as_str()).map(|s| s.to_string());

            let (mut name, version, description, author) = read_plugin_metadata(&install_path);
            // Derive a readable name from the plugin ID when plugin.json is missing
            if name == "Unknown" {
                let short_id = plugin_id.split('@').next().unwrap_or(plugin_id);
                name = short_id
                    .split('-')
                    .map(|w| {
                        let mut c = w.chars();
                        match c.next() {
                            None => String::new(),
                            Some(f) => f.to_uppercase().to_string() + c.as_str(),
                        }
                    })
                    .collect::<Vec<_>>()
                    .join(" ");
            }
            let skills = scan_skills(&install_path);
            let commands = scan_commands(&install_path);

            plugins.push(PluginInfo {
                id: plugin_id.clone(),
                name,
                version,
                description,
                author,
                enabled,
                install_path: install_path_str.to_string(),
                installed_at,
                last_updated,
                skills,
                commands,
            });
        }
    }

    let total_skills: usize = plugins.iter().map(|p| p.skills.len()).sum();
    let total_commands: usize = plugins.iter().map(|p| p.commands.len()).sum();

    Ok(SkillsData {
        plugins,
        total_skills,
        total_commands,
    })
}

#[tauri::command]
pub async fn get_installed_skills() -> Result<SkillsData, String> {
    get_skills_data()
}
