use tauri::Manager;
use tauri::path::BaseDirectory;

#[tauri::command]
pub async fn download_favicon(
    app: tauri::AppHandle,
    url: String,
) -> Result<String, String> {
    // parse url
    let parsed = url::Url::parse(&url)
        .map_err(|e| e.to_string())?;

    // get domain
    let domain = parsed
        .host_str()
        .ok_or("No domain found")?;

    let client = reqwest::Client::builder()
        .user_agent("my-password-manager/1.0")
        .build()
        .map_err(|e| e.to_string())?;

    // fallback favicon sources
    let candidates = [
        format!("{}://{}/favicon.ico", parsed.scheme(), domain),
        format!("{}://{}/favicon.png", parsed.scheme(), domain),
        format!("https://www.{}/favicon.ico", domain),
    ];

    // try each source
    let mut response = None;

    for url in &candidates {
        match client.get(url).send().await {
            Ok(resp) if resp.status().is_success() => {
                response = Some(resp);
                break;
            }
            _ => continue,
        }
    }

    let response = response
        .ok_or("Failed to fetch favicon from all sources")?;

    // IMPORTANT: clone headers before consuming response
    let headers = response.headers().clone();

    let bytes = response
        .bytes()
        .await
        .map_err(|e| e.to_string())?;

    // content type
    let content_type = headers
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("")
        .to_string();

    // validate image
    if !content_type.starts_with("image/") {
        return Err(format!(
            "Invalid content type: {}",
            content_type
        ));
    }

    // appdata/favicons (Tauri handles app name automatically)
    let dir = app
        .path()
        .resolve("favicons", BaseDirectory::AppData)
        .map_err(|e| e.to_string())?;

    // create folder if not exists
    tokio::fs::create_dir_all(&dir)
        .await
        .map_err(|e| e.to_string())?;

    // safe filename
    let safe_domain = sanitize_filename::sanitize(domain);

    // determine extension
    let ext = if content_type.contains("png") {
        "png"
    } else if content_type.contains("svg") {
        "svg"
    } else if content_type.contains("jpeg") {
        "jpg"
    } else if content_type.contains("webp") {
        "webp"
    } else {
        "ico"
    };

    let file_name = format!("{}.{}", safe_domain, ext);
    let file_path = dir.join(file_name);

    // save file
    tokio::fs::write(&file_path, &bytes)
        .await
        .map_err(|e| e.to_string())?;

    // normalize path for Tauri frontend
    let normalized_path = file_path
        .to_string_lossy()
        .replace("\\", "/");

    println!("favicon saved: {}", normalized_path);

    Ok(normalized_path)
}