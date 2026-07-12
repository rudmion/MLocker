use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use tauri::Emitter;

use std::time::Duration;

const REPO: &str = "rudmion/MLocker";
const INSTALL_PATH_FILE: &str = "install_path.json";
const CLEANUP_MARKER: &str = ".update_cleanup.json";

#[derive(Debug, Serialize, Deserialize)]
struct InstallPathRecord {
    path: String,
}

/// Get the real install path.
/// 1. First check install_path.json next to the exe (saved on first run)
/// 2. Fallback: detect from current exe location and save it
fn get_real_install_path() -> Result<String, String> {
    let exe_path =
        std::env::current_exe().map_err(|e| format!("Failed to get exe path: {}", e))?;
    let exe_dir = exe_path
        .parent()
        .ok_or("Failed to get exe parent directory")?;

    // Try reading saved path
    let config_path = exe_dir.join(INSTALL_PATH_FILE);
    if let Ok(content) = std::fs::read_to_string(&config_path) {
        if let Ok(record) = serde_json::from_str::<InstallPathRecord>(&content) {
            let saved = std::path::PathBuf::from(&record.path);
            if saved.exists() {
                return Ok(record.path);
            }
        }
    }

    // First run or config missing — detect and save
    let path_str = exe_dir.to_string_lossy().to_string();
    let record = InstallPathRecord {
        path: path_str.clone(),
    };
    if let Ok(json) = serde_json::to_string_pretty(&record) {
        let _ = std::fs::write(&config_path, json);
    }

    Ok(path_str)
}

/// Save a list of all files in the install directory before updating.
fn save_cleanup_manifest(install_dir: &str) {
    let manifest_path = std::path::PathBuf::from(install_dir).join(CLEANUP_MARKER);
    let mut files: Vec<String> = Vec::new();

    if let Ok(entries) = std::fs::read_dir(install_dir) {
        for entry in entries.flatten() {
            if let Ok(meta) = entry.metadata() {
                let name = entry.file_name();
                if let Some(name_str) = name.to_str() {
                    if meta.is_file() {
                        files.push(name_str.to_string());
                    } else if meta.is_dir() {
                        files.push(format!("{}/", name_str));
                    }
                }
            }
        }
    }

    if let Ok(json) = serde_json::to_string(&files) {
        let _ = std::fs::write(&manifest_path, json);
    }
}

/// Run cleanup after update: remove leftover files from old version.
/// Compares old file list with current directory and deletes files
/// that the new installer did NOT create.
pub fn run_cleanup_after_update(install_dir: &str) {
    let manifest_path = std::path::PathBuf::from(install_dir).join(CLEANUP_MARKER);

    let old_entries: Vec<String> = match std::fs::read_to_string(&manifest_path) {
        Ok(content) => serde_json::from_str(&content).unwrap_or_default(),
        Err(_) => return,
    };

    // Collect current entries
    let mut current_entries = std::collections::HashSet::new();
    if let Ok(entries) = std::fs::read_dir(install_dir) {
        for entry in entries.flatten() {
            if let Ok(meta) = entry.metadata() {
                if let Some(name) = entry.file_name().to_str() {
                    if meta.is_file() {
                        current_entries.insert(name.to_string());
                    } else if meta.is_dir() {
                        current_entries.insert(format!("{}/", name));
                    }
                }
            }
        }
    }

    // Delete entries from old version that don't exist in new version
    for old_entry in &old_entries {
        if old_entry == CLEANUP_MARKER {
            continue;
        }
        if !current_entries.contains(old_entry) {
            // Already removed by installer or doesn't exist — skip
            continue;
        }
        // File/dir exists in both — it was overwritten by installer, keep it
    }

    // Remove the manifest itself
    let _ = std::fs::remove_file(&manifest_path);
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateInfo {
    pub has_update: bool,
    pub current_version: String,
    pub latest_version: String,
    pub body: Option<String>,
    pub html_url: Option<String>,
    pub download_url: Option<String>,
}

fn build_client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .user_agent("MLocker-Updater")
        .timeout(Duration::from_secs(15))
        .connect_timeout(Duration::from_secs(5))
        .build()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn check_for_update(app: AppHandle) -> Result<UpdateInfo, String> {
    let current_version = app.package_info().version.to_string();

    let client = build_client()?;

    // Try releases first
    let release_url = format!("https://api.github.com/repos/{REPO}/releases/latest");
    let response = client
        .get(&release_url)
        .header("Accept", "application/vnd.github.v3+json")
        .send()
        .await
        .map_err(|e| format!("Failed to check for updates: {}", e))?;

    if response.status().as_u16() == 403 {
        return Err("GitHub API rate limit exceeded. Try again later.".to_string());
    }

    if response.status().is_success() {
        let release: serde_json::Value = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse release info: {}", e))?;

        let tag_name = release
            .get("tag_name")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();

        let is_prerelease = release
            .get("prerelease")
            .and_then(|v| v.as_bool())
            .unwrap_or(false);

        // Skip pre-release versions
        if is_prerelease || tag_name.contains('-') {
            return Ok(UpdateInfo {
                has_update: false,
                current_version: current_version.clone(),
                latest_version: current_version,
                body: None,
                html_url: None,
                download_url: None,
            });
        }

        let latest_version = tag_name.trim_start_matches('v').to_string();
        let has_update = compare_versions(&latest_version, &current_version);
        let download_url = find_download_url(&release);

        return Ok(UpdateInfo {
            has_update,
            current_version,
            latest_version,
            body: release
                .get("body")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string()),
            html_url: release
                .get("html_url")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string()),
            download_url,
        });
    }

    // Fallback: check tags if no releases exist
    let tags_url = format!("https://api.github.com/repos/{REPO}/tags");
    let tags_response = client
        .get(&tags_url)
        .header("Accept", "application/vnd.github.v3+json")
        .send()
        .await
        .map_err(|e| format!("Failed to check tags: {}", e))?;

    if tags_response.status().as_u16() == 403 {
        return Err("GitHub API rate limit exceeded. Try again later.".to_string());
    }

    if tags_response.status().is_success() {
        let tags: Vec<serde_json::Value> = tags_response
            .json()
            .await
            .map_err(|e| format!("Failed to parse tags: {}", e))?;

        if let Some(latest_tag) = tags.first() {
            let tag_name = latest_tag
                .get("name")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();

            // Skip pre-release tags
            if tag_name.contains('-') {
                return Ok(UpdateInfo {
                    has_update: false,
                    current_version: current_version.clone(),
                    latest_version: current_version,
                    body: None,
                    html_url: None,
                    download_url: None,
                });
            }

            let latest_version = tag_name.trim_start_matches('v').to_string();
            let has_update = compare_versions(&latest_version, &current_version);

            let html_url = format!("https://github.com/{REPO}/releases/tag/{tag_name}");

            return Ok(UpdateInfo {
                has_update,
                current_version,
                latest_version,
                body: None,
                html_url: Some(html_url),
                download_url: None,
            });
        }
    }

    // No releases and no tags — can't determine
    Ok(UpdateInfo {
        has_update: false,
        current_version: current_version.clone(),
        latest_version: current_version,
        body: None,
        html_url: None,
        download_url: None,
    })
}

#[tauri::command]
pub async fn download_update(app: AppHandle, url: String) -> Result<String, String> {
    let client = build_client()?;

    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Failed to start download: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Download failed with status: {}", response.status()));
    }

    let total_size = response.content_length().unwrap_or(0);

    let file_name = url
        .rsplit('/')
        .next()
        .unwrap_or("update.exe")
        .to_string();

    let temp_dir = std::env::temp_dir();
    let file_path = temp_dir.join(&file_name);

    let mut file = std::fs::File::create(&file_path)
        .map_err(|e| format!("Failed to create temp file: {}", e))?;

    let mut downloaded: u64 = 0;
    let mut stream = response.bytes_stream();

    use futures_util::StreamExt;

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("Download error: {}", e))?;
        std::io::Write::write_all(&mut file, &chunk)
            .map_err(|e| format!("Failed to write file: {}", e))?;

        downloaded += chunk.len() as u64;

        let _ = app.emit(
            "update-progress",
            serde_json::json!({
                "downloaded": downloaded,
                "total": total_size,
            }),
        );
    }

    drop(file);

    // Validate downloaded file
    let file_metadata = std::fs::metadata(&file_path)
        .map_err(|e| format!("Failed to check downloaded file: {}", e))?;
    let file_size = file_metadata.len();
    if file_size < 1024 {
        let _ = std::fs::remove_file(&file_path);
        return Err(format!(
            "Downloaded file is too small ({} bytes) — likely corrupted",
            file_size
        ));
    }

    Ok(file_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn get_install_path(_app: AppHandle) -> Result<String, String> {
    get_real_install_path()
}

#[tauri::command]
pub fn restart_app(app: AppHandle) -> Result<(), String> {
    app.restart();
}

#[tauri::command]
pub async fn install_downloaded_update(app: AppHandle, file_path: String) -> Result<(), String> {
    let file_path = std::path::PathBuf::from(&file_path);

    if !file_path.exists() {
        return Err("Installer file not found".to_string());
    }

    // Get the actual install path from saved config or exe location
    let install_path = get_real_install_path().unwrap_or_else(|_| "Unknown".to_string());

    // Emit installing status
    let _ = app.emit(
        "update-progress",
        serde_json::json!({
            "status": "installing",
            "downloaded": 0,
            "total": 0,
            "installPath": install_path,
        }),
    );

    #[cfg(target_os = "windows")]
    {
        // Save file list before update for cleanup afterward
        save_cleanup_manifest(&install_path);

        // Try to run old version's uninstaller first to clean up leftover files
        let uninstaller = std::path::PathBuf::from(&install_path).join("uninstall.exe");
        if uninstaller.exists() {
            let _ = std::process::Command::new(&uninstaller)
                .arg("/S")
                .spawn()
                .and_then(|mut child| {
                    // Wait briefly for uninstaller to finish
                    let _ = child.wait();
                    Ok(())
                });
        }

        // Build the NSIS silent-install command with /D=<install_path>
        let nsis_install_dir = install_path.trim_end_matches('\\').trim_end_matches('/');
        let mut cmd = std::process::Command::new(&file_path);
        cmd.arg("/S");
        cmd.arg(format!("/D={}", nsis_install_dir));
        let mut child = cmd
            .spawn()
            .map_err(|e| format!("Failed to launch installer: {}", e))?;

        let app_progress = app.clone();
        let install_path_clone = install_path.clone();
        std::thread::spawn(move || {
            let _ = app_progress.emit(
                "update-progress",
                serde_json::json!({
                    "status": "installing",
                    "downloaded": 0,
                    "total": 0,
                    "installPath": install_path_clone,
                }),
            );

            let timeout = Duration::from_secs(300);
            let start = std::time::Instant::now();

            loop {
                if start.elapsed() > timeout {
                    let _ = app_progress.emit(
                        "update-status",
                        serde_json::json!({ "status": "installed" }),
                    );
                    break;
                }

                match child.try_wait() {
                    Ok(Some(status)) => {
                        std::thread::sleep(Duration::from_secs(5));

                        let _ = app_progress.emit(
                            "update-status",
                            serde_json::json!({
                                "status": "installed",
                                "exitCode": status.code()
                            }),
                        );
                        break;
                    }
                    Ok(None) => {
                        std::thread::sleep(Duration::from_secs(1));
                    }
                    Err(_) => {
                        let _ = app_progress.emit(
                            "update-status",
                            serde_json::json!({ "status": "installed" }),
                        );
                        break;
                    }
                }
            }

            // Run cleanup after installer finishes
            run_cleanup_after_update(&install_path_clone);
        });
    }

    #[cfg(target_os = "macos")]
    {
        let mut child = std::process::Command::new("open")
            .arg(&file_path)
            .spawn()
            .map_err(|e| format!("Failed to open installer: {}", e))?;

        let app_progress = app.clone();
        let install_path_clone = install_path.clone();
        std::thread::spawn(move || {
            let _ = app_progress.emit(
                "update-progress",
                serde_json::json!({
                    "status": "installing",
                    "downloaded": 0,
                    "total": 0,
                    "installPath": install_path_clone,
                }),
            );

            let timeout = Duration::from_secs(300);
            let start = std::time::Instant::now();
            loop {
                if start.elapsed() > timeout {
                    let _ = app_progress.emit(
                        "update-status",
                        serde_json::json!({ "status": "installed" }),
                    );
                    break;
                }
                match child.try_wait() {
                    Ok(Some(_)) => {
                        std::thread::sleep(Duration::from_secs(3));
                        let _ = app_progress.emit(
                            "update-status",
                            serde_json::json!({ "status": "installed" }),
                        );
                        break;
                    }
                    Ok(None) => {
                        std::thread::sleep(Duration::from_secs(1));
                    }
                    Err(_) => {
                        let _ = app_progress.emit(
                            "update-status",
                            serde_json::json!({ "status": "installed" }),
                        );
                        break;
                    }
                }
            }
        });
    }

    #[cfg(target_os = "linux")]
    {
        let path_str = file_path.to_string_lossy().to_string();

        let mut child = if path_str.ends_with(".AppImage") {
            std::process::Command::new("chmod")
                .arg("+x")
                .arg(&file_path)
                .spawn()
                .map_err(|e| format!("Failed to chmod: {}", e))?;

            std::process::Command::new(&file_path)
                .spawn()
                .map_err(|e| format!("Failed to run AppImage: {}", e))?
        } else {
            std::process::Command::new("xdg-open")
                .arg(&file_path)
                .spawn()
                .map_err(|e| format!("Failed to open installer: {}", e))?
        };

        let app_progress = app.clone();
        std::thread::spawn(move || {
            let _ = app_progress.emit(
                "update-progress",
                serde_json::json!({
                    "status": "installing",
                    "downloaded": 0,
                    "total": 0,
                    "installPath": install_path,
                }),
            );

            let timeout = Duration::from_secs(300);
            let start = std::time::Instant::now();
            loop {
                if start.elapsed() > timeout {
                    let _ = app_progress.emit(
                        "update-status",
                        serde_json::json!({ "status": "installed" }),
                    );
                    break;
                }
                match child.try_wait() {
                    Ok(Some(_)) => {
                        std::thread::sleep(Duration::from_secs(3));
                        let _ = app_progress.emit(
                            "update-status",
                            serde_json::json!({ "status": "installed" }),
                        );
                        break;
                    }
                    Ok(None) => {
                        std::thread::sleep(Duration::from_secs(1));
                    }
                    Err(_) => {
                        let _ = app_progress.emit(
                            "update-status",
                            serde_json::json!({ "status": "installed" }),
                        );
                        break;
                    }
                }
            }
        });
    }

    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        return Err("Unsupported platform for auto-install".to_string());
    }

    Ok(())
}

fn find_download_url(release: &serde_json::Value) -> Option<String> {
    let assets = release.get("assets")?.as_array()?;

    #[cfg(target_os = "windows")]
    let patterns = ["setup.exe", ".msi", ".exe"];
    #[cfg(target_os = "macos")]
    let patterns = [".dmg", ".app"];
    #[cfg(target_os = "linux")]
    let patterns = [".AppImage", ".deb", ".rpm"];

    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    let patterns: [&str; 0] = [];

    for asset in assets {
        let name = asset.get("name")?.as_str()?;
        let name_lower = name.to_lowercase();
        for pattern in &patterns {
            if name_lower.ends_with(pattern) {
                return asset.get("browser_download_url").and_then(|v| v.as_str()).map(|s| s.to_string());
            }
        }
    }

    // Fallback: first asset
    assets.first().and_then(|a| {
        a.get("browser_download_url")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string())
    })
}

fn compare_versions(latest: &str, current: &str) -> bool {
    let parse = |v: &str| -> Vec<u32> {
        v.split('.')
            .filter_map(|s| s.parse().ok())
            .collect()
    };

    let latest_parts = parse(latest);
    let current_parts = parse(current);

    let max_len = latest_parts.len().max(current_parts.len());

    for i in 0..max_len {
        let l = latest_parts.get(i).copied().unwrap_or(0);
        let c = current_parts.get(i).copied().unwrap_or(0);
        if l > c {
            return true;
        }
        if l < c {
            return false;
        }
    }

    false
}
