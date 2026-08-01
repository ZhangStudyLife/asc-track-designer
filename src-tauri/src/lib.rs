use std::{fs, path::PathBuf};

fn migration_directory() -> Result<PathBuf, String> {
    std::env::var_os("APPDATA")
        .map(PathBuf::from)
        .map(|path| path.join("asc-track-designer"))
        .ok_or_else(|| "APPDATA is unavailable".to_string())
}

#[tauri::command]
fn read_legacy_migration() -> Result<Option<String>, String> {
    let directory = migration_directory()?;
    if directory.join("migration-state-v1.imported").exists() {
        return Ok(None);
    }

    let source = directory.join("migration-state-v1.json");
    if !source.exists() {
        return Ok(None);
    }

    fs::read_to_string(source).map(Some).map_err(|error| error.to_string())
}

#[tauri::command]
fn mark_legacy_migration_imported() -> Result<(), String> {
    let directory = migration_directory()?;
    fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
    fs::write(directory.join("migration-state-v1.imported"), b"imported")
        .map_err(|error| error.to_string())
}

#[cfg(windows)]
fn show_startup_error(message: &str) {
    use windows_sys::Win32::UI::WindowsAndMessaging::{MessageBoxW, MB_ICONERROR, MB_OK};

    let title: Vec<u16> = "ASC Track Designer\0".encode_utf16().collect();
    let body: Vec<u16> = format!(
        "ASC Track Designer failed to start. Ensure Microsoft Edge WebView2 Runtime is installed.\n\n{message}\0"
    )
    .encode_utf16()
    .collect();

    unsafe {
        MessageBoxW(std::ptr::null_mut(), body.as_ptr(), title.as_ptr(), MB_OK | MB_ICONERROR);
    }
}

#[cfg(not(windows))]
fn show_startup_error(message: &str) {
    eprintln!("ASC Track Designer failed to start: {message}");
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let result = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            read_legacy_migration,
            mark_legacy_migration_imported,
        ])
        .run(tauri::generate_context!());

    if let Err(error) = result {
        show_startup_error(&error.to_string());
    }
}
