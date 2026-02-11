mod agent;
mod commands;
mod tray;

use std::sync::Arc;
use tokio::sync::Mutex;

type ManagerState = Arc<Mutex<agent::manager::AgentManager>>;

pub fn run() {
    let agent_manager: ManagerState = Arc::new(Mutex::new(agent::manager::AgentManager::new()));
    let running_cmd: commands::RunningCommandState = Arc::new(Mutex::new(std::collections::HashMap::new()));

    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(agent_manager)
        .manage(running_cmd)
        .invoke_handler(tauri::generate_handler![
            commands::create_agent,
            commands::send_prompt,
            commands::stop_agent,
            commands::kill_agent,
            commands::remove_agent,
            commands::list_agents,
            commands::run_command,
            commands::kill_running_command,
            commands::open_terminal,
            commands::open_claude_terminal,
        ])
        .setup(|app| {
            tray::setup_tray(app)?;
            Ok(())
        })
        .on_window_event(|_window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                // Kill all tracked child processes on window close.
                // Uses a global std::sync::Mutex registry that's always lockable.
                agent::process::kill_all_children();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
