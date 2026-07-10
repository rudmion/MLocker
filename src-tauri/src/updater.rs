use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use tauri::Emitter;
use tauri::Manager;

const REPO: &str = "rudmion/MLocker";

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateInfo {
    pub has_update: bool,
    pub current_version: String,
    pub latest_version: String,
    pub body: Option<String>,
    pub html_url: Option<String>,
    pub download_url: Option<String>,
}

#[tauri::command]
pub async fn check_for_update(app: AppHandle) -> Result<UpdateInfo, String> {
    let current_version = app.package_info().version.to_string();

    let client = reqwest::Client::builder()
        .user_agent("MLocker-Updater")
        .build()
        .map_err(|e| e.to_string())?;

    // Try releases first
    let release_url = format!("https://api.github.com/repos/{REPO}/releases/latest");
    let response = client
        .get(&release_url)
        .header("Accept", "application/vnd.github.v3+json")
        .send()
        .await
        .map_err(|e| format!("Failed to check for updates: {}", e))?;

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
    let client = reqwest::Client::builder()
        .user_agent("MLocker-Updater")
        .build()
        .map_err(|e| e.to_string())?;

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

    // Save path for later install
    let pending_path = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    std::fs::create_dir_all(&pending_path)
        .map_err(|e| format!("Failed to create app data dir: {}", e))?;
    let pending_file = pending_path.join("pending_update.json");
    std::fs::write(
        &pending_file,
        serde_json::json!({ "path": file_path.to_string_lossy().to_string() }).to_string(),
    )
    .map_err(|e| format!("Failed to save pending update: {}", e))?;

    Ok(file_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn install_downloaded_update(app: AppHandle) -> Result<(), String> {
    let pending_path = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    let pending_file = pending_path.join("pending_update.json");

    let content = std::fs::read_to_string(&pending_file)
        .map_err(|e| format!("Failed to read pending update: {}", e))?;
    let data: serde_json::Value =
        serde_json::from_str(&content).map_err(|e| format!("Failed to parse pending update: {}", e))?;
    let file_path = data["path"]
        .as_str()
        .ok_or("No pending update path")?;

    let file_path = std::path::PathBuf::from(file_path);

    if !file_path.exists() {
        return Err("Installer file not found".to_string());
    }

    // Get current install directory from running executable
    let exe_path =
        std::env::current_exe().map_err(|e| format!("Failed to get current exe path: {}", e))?;
    let install_dir = exe_path
        .parent()
        .ok_or("Failed to get install directory")?;

    // Launch installer silently with /S and /D=<install_dir>
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new(&file_path)
            .arg("/S")
            .arg(format!("/D={}", install_dir.display()))
            .spawn()
            .map_err(|e| format!("Failed to launch installer: {}", e))?;
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg("-W")
            .arg(&file_path)
            .spawn()
            .map_err(|e| format!("Failed to open installer: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&file_path)
            .spawn()
            .map_err(|e| format!("Failed to open installer: {}", e))?;
    }

    // Cleanup
    let _ = std::fs::remove_file(&pending_file);

    Ok(())
}

fn find_download_url(release: &serde_json::Value) -> Option<String> {
    let assets = release.get("assets")?.as_array()?;

    #[cfg(target_os = "windows")]
    let patterns = ["setup.exe", ".msi", ".exe"];
    #[cfg(target_os = "macos")]
    let patterns = [".dmg", ".app"];
    #[cfg(target_os = "linux")]
    let patterns = [".deb", ".AppImage", ".rpm"];

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
