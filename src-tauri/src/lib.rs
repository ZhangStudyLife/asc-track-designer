#![cfg_attr(test, allow(dead_code, unused_imports))]

use std::{fs, path::PathBuf};

mod updater;

const WEBVIEW2_LOADER: &[u8] = include_bytes!("../vendor/webview2-com-sys/x64/WebView2Loader.dll");

fn migration_directory() -> Result<PathBuf, String> {
    std::env::var_os("APPDATA")
        .map(PathBuf::from)
        .map(|path| path.join("asc-track-designer"))
        .ok_or_else(|| "APPDATA is unavailable".to_string())
}

#[cfg_attr(not(test), tauri::command)]
fn read_legacy_migration() -> Result<Option<String>, String> {
    let directory = migration_directory()?;
    if directory.join("migration-state-v1.imported").exists() {
        return Ok(None);
    }

    let source = directory.join("migration-state-v1.json");
    if !source.exists() {
        return Ok(None);
    }

    fs::read_to_string(source)
        .map(Some)
        .map_err(|error| error.to_string())
}

#[cfg_attr(not(test), tauri::command)]
fn mark_legacy_migration_imported() -> Result<(), String> {
    let directory = migration_directory()?;
    fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
    fs::write(directory.join("migration-state-v1.imported"), b"imported")
        .map_err(|error| error.to_string())
}

fn prepare_webview2_loader() -> Result<(), String> {
    let base = std::env::var_os("LOCALAPPDATA")
        .or_else(|| std::env::var_os("APPDATA"))
        .map(PathBuf::from)
        .ok_or_else(|| "Windows application data directory is unavailable".to_string())?;
    let directory = base
        .join("ASC Track Designer")
        .join("runtime")
        .join(env!("CARGO_PKG_VERSION"));
    let path = directory.join("WebView2Loader.dll");

    fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
    if fs::read(&path).ok().as_deref() != Some(WEBVIEW2_LOADER) {
        fs::write(&path, WEBVIEW2_LOADER).map_err(|error| error.to_string())?;
    }

    std::env::set_var("ASC_WEBVIEW2_LOADER_PATH", path);
    Ok(())
}

#[cfg(windows)]
fn verify_webview2_runtime() -> Result<(), String> {
    use webview2_com_sys::Microsoft::Web::WebView2::Win32::GetAvailableCoreWebView2BrowserVersionString;
    use windows_core::{PCWSTR, PWSTR};
    use windows_sys::Win32::System::Com::CoTaskMemFree;

    let mut version = PWSTR::null();
    unsafe {
        GetAvailableCoreWebView2BrowserVersionString(PCWSTR::null(), &mut version)
            .map_err(|error| format!("Microsoft Edge WebView2 Runtime is unavailable: {error}"))?;

        if version.is_null() {
            return Err(
                "Microsoft Edge WebView2 Runtime returned no version information".to_string(),
            );
        }

        let version_text = version.to_string().map_err(|error| error.to_string());
        CoTaskMemFree(version.as_ptr().cast());

        if version_text?.trim().is_empty() {
            return Err("Microsoft Edge WebView2 Runtime returned an empty version".to_string());
        }
    }

    Ok(())
}

#[cfg(not(windows))]
fn verify_webview2_runtime() -> Result<(), String> {
    Ok(())
}

#[cfg(windows)]
fn show_startup_error(message: &str) {
    use windows_sys::Win32::UI::WindowsAndMessaging::{MessageBoxW, MB_ICONERROR, MB_OK};

    let title: Vec<u16> = "ASC Track Designer\0".encode_utf16().collect();
    let body: Vec<u16> = format!(
        "ASC Track Designer failed to start. Ensure Microsoft Edge WebView2 Runtime is installed.\n\nDownload: https://developer.microsoft.com/microsoft-edge/webview2/\n\n{message}\0"
    )
    .encode_utf16()
    .collect();

    unsafe {
        MessageBoxW(
            std::ptr::null_mut(),
            body.as_ptr(),
            title.as_ptr(),
            MB_OK | MB_ICONERROR,
        );
    }
}

#[cfg(not(windows))]
fn show_startup_error(message: &str) {
    eprintln!("ASC Track Designer failed to start: {message}");
}

#[cfg(not(test))]
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    if let Err(error) = prepare_webview2_loader() {
        show_startup_error(&error);
        return;
    }
    if let Err(error) = verify_webview2_runtime() {
        show_startup_error(&error);
        return;
    }

    let result = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            read_legacy_migration,
            mark_legacy_migration_imported,
            updater::check_for_update,
            updater::download_update,
            updater::install_update,
            updater::confirm_update_startup,
        ])
        .run(tauri::generate_context!());

    if let Err(error) = result {
        show_startup_error(&error.to_string());
    }
}
