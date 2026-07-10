use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateInfo {
    pub has_update: bool,
    pub current_version: String,
    pub latest_version: String,
    pub body: Option<String>,
    pub html_url: Option<String>,
}

#[tauri::command]
pub async fn check_for_update(app: tauri::AppHandle) -> Result<UpdateInfo, String> {
    let current_version = app.package_info().version.to_string();

    let client = reqwest::Client::builder()
        .user_agent("MLocker-Updater")
        .build()
        .map_err(|e| e.to_string())?;

    let response = client
        .get("https://api.github.com/repos/rudmion/MLocker/releases/latest")
        .header("Accept", "application/vnd.github.v3+json")
        .send()
        .await
        .map_err(|e| format!("Failed to check for updates: {}", e))?;

    if !response.status().is_success() {
        return Ok(UpdateInfo {
            has_update: false,
            current_version: current_version.clone(),
            latest_version: current_version,
            body: None,
            html_url: None,
        });
    }

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

    Ok(UpdateInfo {
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
