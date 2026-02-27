mod agent;
mod automations;
mod commands;
mod skills;
mod tray;

use std::sync::Arc;
use tokio::sync::Mutex;

type ManagerState = Arc<Mutex<agent::manager::AgentManager>>;

pub fn run() {
    let agent_manager: ManagerState = Arc::new(Mutex::new(agent::manager::AgentManager::new()));
    let running_cmd: commands::RunningCommandState = Arc::new(Mutex::new(std::collections::HashMap::new()));
    let automations_state: automations::AutomationsStateHandle =
        Arc::new(Mutex::new(automations::AutomationsState::load()));

    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(agent_manager.clone())
        .manage(running_cmd)
        .manage(automations_state.clone())
        .invoke_handler(tauri::generate_handler![
            commands::create_agent,
            commands::send_prompt,
            commands::stop_agent,
            commands::kill_agent,
            commands::remove_agent,
            commands::list_agents,
            commands::detect_engines,
            commands::run_command,
            commands::kill_running_command,
            commands::open_terminal,
            commands::open_claude_terminal,
            skills::get_installed_skills,
            automations::list_automations,
            automations::create_automation,
            automations::update_automation,
            automations::delete_automation,
            automations::run_automation_now,
        ])
        .setup(move |app| {
            tray::setup_tray(app)?;

            // Spawn background scheduler that ticks every 60 seconds
            let auto_state = automations_state.clone();
            let mgr = agent_manager.clone();
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                loop {
                    tokio::time::sleep(std::time::Duration::from_secs(60)).await;
                    automations::tick(&auto_state, &mgr, &handle).await;
                }
            });

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
