/// Set dock badge count. For now this updates the tray tooltip.
/// Full dock badge requires native macOS API integration.
pub fn set_badge_count(app: &tauri::AppHandle, count: usize) {
    // Update tray tooltip with count
    if let Some(tray) = app.tray_by_id("main") {
        let tooltip = if count > 0 {
            format!("Cadenza — {} need attention", count)
        } else {
            "Cadenza".to_string()
        };
        let _ = tray.set_tooltip(Some(&tooltip));
    }
}
