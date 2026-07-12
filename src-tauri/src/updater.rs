use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use tauri::Emitter;

use std::time::Duration;

const REPO: &str = "rudmion/MLocker";
const INSTALL_PATH_FILE: &str = "install_path.json";

#[derive(Debug, Serialize, Deserialize)]
struct InstallPathRecord {
    path: String,
}

/// Get the real install path from install_path.json
fn get_real_install_path() -> Result<String, String> {
    let exe_path =
        std::env::current_exe().map_err(|e| format!("Failed to get exe path: {}", e))?;
    let exe_dir = exe_path
        .parent()
        .ok_or("Failed to get exe parent directory")?;

    let config_path = exe_dir.join(INSTALL_PATH_FILE);
    if let Ok(content) = std::fs::read_to_string(&config_path) {
        if let Ok(record) = serde_json::from_str::<InstallPathRecord>(&content) {
            let saved = std::path::PathBuf::from(&record.path);
            if saved.exists() {
                return Ok(record.path);
            }
        }
    }

    let path_str = exe_dir.to_string_lossy().to_string();
    let record = InstallPathRecord { path: path_str.clone() };
    if let Ok(json) = serde_json::to_string_pretty(&record) {
        let _ = std::fs::write(&config_path, json);
    }

    Ok(path_str)
}

/// Get the default NSIS install directory for this app.
/// NSIS installs to %LOCALAPPDATA%\{productName} by default.
fn get_nsis_default_dir() -> Result<String, String> {
    let local_app_data = std::env::var("LOCALAPPDATA")
        .map_err(|e| format!("LOCALAPPDATA not set: {}", e))?;
    Ok(format!("{}\\MLocker", local_app_data))
}

/// Copy a directory recursively, overwriting files in dst.
fn copy_dir_recursive(src: &std::path::Path, dst: &std::path::Path) -> Result<(), String> {
    std::fs::create_dir_all(dst)
        .map_err(|e| format!("Failed to create dir {}: {}", dst.display(), e))?;

    let entries = std::fs::read_dir(src)
        .map_err(|e| format!("Failed to read dir {}: {}", src.display(), e))?;

    for entry in entries.flatten() {
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());

        if src_path.is_dir() {
            copy_dir_recursive(&src_path, &dst_path)?;
        } else {
            std::fs::copy(&src_path, &dst_path)
                .map_err(|e| format!("Failed to copy {} -> {}: {}",
                    src_path.display(), dst_path.display(), e))?;
        }
    }

    Ok(())
}

/// Remove a directory recursively.
fn remove_dir_recursive(path: &std::path::Path) -> Result<(), String> {
    if path.exists() {
        std::fs::remove_dir_all(path)
            .map_err(|e| format!("Failed to remove {}: {}", path.display(), e))?;
    }
    Ok(())
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

    // Fallback: check tags if releases endpoint returned non-403 error (e.g. 404)
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

            let html_url = format!("https://github.com/{REPO}/releases/tag/{tag_name}");

            // Tags don't have assets — no download URL available
            // Only report update if user can actually download it
            return Ok(UpdateInfo {
                has_update: false,
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

    // Get the user's custom install path (where the app currently runs from)
    let custom_path = get_real_install_path().unwrap_or_else(|_| "Unknown".to_string());

    // Get the default NSIS install directory
    let nsis_default = get_nsis_default_dir().unwrap_or_else(|_| "Unknown".to_string());

    // Emit installing status
    let _ = app.emit(
        "update-progress",
        serde_json::json!({
            "status": "installing",
            "downloaded": 0,
            "total": 0,
            "installPath": custom_path,
        }),
    );

    #[cfg(target_os = "windows")]
    {
        let custom_path_clone = custom_path.clone();
        let nsis_default_clone = nsis_default.clone();
        let app_clone = app.clone();
        let installer_path = file_path.clone();

        std::thread::spawn(move || {
            let _ = app_clone.emit(
                "update-progress",
                serde_json::json!({
                    "status": "installing",
                    "downloaded": 0,
                    "total": 0,
                    "installPath": custom_path_clone,
                }),
            );

            // Step 1: Run NSIS installer (it will install to its default dir)
            let mut cmd = std::process::Command::new(&installer_path);
            cmd.arg("/S");
            let mut child = match cmd.spawn() {
                Ok(c) => c,
                Err(e) => {
                    let _ = app_clone.emit(
                        "update-status",
                        serde_json::json!({ "status": "error", "error": format!("Failed to launch installer: {}", e) }),
                    );
                    return;
                }
            };

            // Step 2: Wait for installer to finish
            let timeout = Duration::from_secs(300);
            let start = std::time::Instant::now();
            let mut exited = false;
            loop {
                if start.elapsed() > timeout {
                    break;
                }
                match child.try_wait() {
                    Ok(Some(_)) => {
                        // Parent exited — wait for NSIS child processes
                        std::thread::sleep(Duration::from_secs(2));
                        exited = true;
                        break;
                    }
                    Ok(None) => {
                        std::thread::sleep(Duration::from_secs(1));
                    }
                    Err(_) => break,
                }
            }

            // Wait for any remaining NSIS child processes to finish
            // NSIS forks children that do the actual file operations
            if exited {
                let nsis_default_path = std::path::PathBuf::from(&nsis_default_clone);
                let wait_deadline = std::time::Instant::now() + Duration::from_secs(15);
                loop {
                    if std::time::Instant::now() > wait_deadline {
                        break;
                    }
                    // Check if any NSIS-related processes are still running
                    // by attempting to lock the install directory
                    let test_file = nsis_default_path.join(".update_lock_test");
                    if std::fs::File::create(&test_file).is_ok() {
                        let _ = std::fs::remove_file(&test_file);
                        break; // Directory is accessible — NSIS finished
                    }
                    std::thread::sleep(Duration::from_secs(1));
                }
            }

            // Step 3: NSIS installed to default dir. Now copy files to user's custom dir.
            let nsis_default_path = std::path::PathBuf::from(&nsis_default_clone);
            let custom_path_obj = std::path::PathBuf::from(&custom_path_clone);

            if nsis_default_path.exists() && nsis_default_path != custom_path_obj {
                // Copy new files from default dir to custom dir
                if let Err(e) = copy_dir_recursive(&nsis_default_path, &custom_path_obj) {
                    let _ = app_clone.emit(
                        "update-status",
                        serde_json::json!({ "status": "error", "error": format!("Failed to copy update files: {}", e) }),
                    );
                    return;
                }

                // Copy succeeded — delete the default dir
                let _ = remove_dir_recursive(&nsis_default_path);

                // Update install_path.json to reflect the current location
                let config_path = custom_path_obj.join(INSTALL_PATH_FILE);
                let record = InstallPathRecord {
                    path: custom_path_clone,
                };
                if let Ok(json) = serde_json::to_string_pretty(&record) {
                    let _ = std::fs::write(&config_path, json);
                }
            }

            // Step 4: Delete the installer from temp
            let _ = std::fs::remove_file(&installer_path);

            let _ = app_clone.emit(
                "update-status",
                serde_json::json!({ "status": "installed" }),
            );
        });
    }

    #[cfg(target_os = "macos")]
    {
        let mut child = std::process::Command::new("open")
            .arg(&file_path)
            .spawn()
            .map_err(|e| format!("Failed to open installer: {}", e))?;

        let app_progress = app.clone();
        let install_path_clone = custom_path.clone();
        let installer_path = file_path.clone();
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
                        let _ = std::fs::remove_file(&installer_path);
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
        let installer_path = file_path.clone();
        std::thread::spawn(move || {
            let _ = app_progress.emit(
                "update-progress",
                serde_json::json!({
                    "status": "installing",
                    "downloaded": 0,
                    "total": 0,
                    "installPath": custom_path,
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
                        let _ = std::fs::remove_file(&installer_path);
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
            .take(3)
            .map(|s| s.chars().take_while(|c| c.is_ascii_digit()).collect::<String>())
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
