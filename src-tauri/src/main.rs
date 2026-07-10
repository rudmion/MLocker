#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod favicon;
mod crypto;

use tauri::{Manager, State};
use std::sync::Mutex;
use std::path::PathBuf;

#[derive(Default)]
struct AppState {
    path: Mutex<PathBuf>,
    encryption_key: Mutex<Option<[u8; 32]>>,
}

fn is_already_encrypted(data: &serde_json::Value, enc_key: &[u8; 32]) -> bool {
    data.get("sections")
        .and_then(|s| s.as_array())
        .and_then(|arr| arr.first())
        .and_then(|section| section.get("entries"))
        .and_then(|e| e.as_array())
        .and_then(|entries| entries.first())
        .and_then(|entry| entry.get("login"))
        .and_then(|v| v.as_str())
        .map(|login| !login.is_empty() && crypto::decrypt_field(login, enc_key).is_ok())
        .unwrap_or(false)
}

fn encrypt_sections(sections: &serde_json::Value, key: &[u8; 32]) -> Result<serde_json::Value, String> {
    let mut sections = sections.clone();
    if let Some(arr) = sections.as_array_mut() {
        for section in arr.iter_mut() {
            if let Some(entries) = section.get_mut("entries").and_then(|v| v.as_array_mut()) {
                for entry in entries.iter_mut() {
                    if let Some(login) = entry.get("login").and_then(|v| v.as_str()) {
                        if !login.is_empty() {
                            entry["login"] = serde_json::Value::String(crypto::encrypt_field(login, key)?);
                        }
                    }
                    if let Some(password) = entry.get("password").and_then(|v| v.as_str()) {
                        if !password.is_empty() {
                            entry["password"] = serde_json::Value::String(crypto::encrypt_field(password, key)?);
                        }
                    }
                    if let Some(custom_fields) = entry.get_mut("customFields").and_then(|v| v.as_array_mut()) {
                        for field in custom_fields.iter_mut() {
                            if let Some(value) = field.get("value").and_then(|v| v.as_str()) {
                                if !value.is_empty() {
                                    field["value"] = serde_json::Value::String(crypto::encrypt_field(value, key)?);
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    Ok(sections)
}

fn decrypt_sections(sections: &serde_json::Value, key: &[u8; 32]) -> Result<serde_json::Value, String> {
    let mut sections = sections.clone();
    if let Some(arr) = sections.as_array_mut() {
        for section in arr.iter_mut() {
            if let Some(entries) = section.get_mut("entries").and_then(|v| v.as_array_mut()) {
                for entry in entries.iter_mut() {
                    if let Some(login) = entry.get("login").and_then(|v| v.as_str()) {
                        if !login.is_empty() {
                            entry["login"] = serde_json::Value::String(
                                crypto::decrypt_field(login, key).unwrap_or_else(|_| login.to_string())
                            );
                        }
                    }
                    if let Some(password) = entry.get("password").and_then(|v| v.as_str()) {
                        if !password.is_empty() {
                            entry["password"] = serde_json::Value::String(
                                crypto::decrypt_field(password, key).unwrap_or_else(|_| password.to_string())
                            );
                        }
                    }
                    if let Some(custom_fields) = entry.get_mut("customFields").and_then(|v| v.as_array_mut()) {
                        for field in custom_fields.iter_mut() {
                            if let Some(value) = field.get("value").and_then(|v| v.as_str()) {
                                if !value.is_empty() {
                                    field["value"] = serde_json::Value::String(
                                        crypto::decrypt_field(value, key).unwrap_or_else(|_| value.to_string())
                                    );
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    Ok(sections)
}

#[tauri::command]
async fn load_data(state: State<'_, AppState>) -> Result<String, String> {
    let (path, key) = {
        let path_guard = state.path.lock().unwrap();
        let key_guard = state.encryption_key.lock().unwrap();
        (path_guard.clone(), *key_guard)
    };

    let content = match tokio::fs::read_to_string(&path).await {
        Ok(c) => c,
        Err(_) => {
            let default = r#"{"sections":[]}"#;
            tokio::fs::write(&path, default).await.map_err(|e| e.to_string())?;
            default.to_string()
        }
    };

    if let Some(key) = key {
        let content_clone = content.clone();
        let result = tokio::task::spawn_blocking(move || {
            let mut data: serde_json::Value = serde_json::from_str(&content_clone)
                .map_err(|e| e.to_string())?;
            if let Some(sections) = data.get("sections") {
                data["sections"] = decrypt_sections(sections, &key)?;
            }
            serde_json::to_string(&data).map_err(|e| e.to_string())
        }).await.map_err(|e| e.to_string())??;
        return Ok(result);
    }

    Ok(content)
}

#[tauri::command]
async fn save_data(data: String, state: State<'_, AppState>) -> Result<(), String> {
    let (path, key) = {
        let path_guard = state.path.lock().unwrap();
        let key_guard = state.encryption_key.lock().unwrap();
        (path_guard.clone(), *key_guard)
    };

    if let Some(parent) = path.parent() {
        tokio::fs::create_dir_all(parent).await.map_err(|e| e.to_string())?;
    }

    let path_clone = path.clone();

    let content = tokio::task::spawn_blocking(move || {
        if let Some(key) = key {
            let mut parsed: serde_json::Value = serde_json::from_str(&data)
                .map_err(|e| format!("Invalid JSON: {}", e))?;
            if let Some(sections) = parsed.get("sections") {
                parsed["sections"] = encrypt_sections(sections, &key)?;
            }
            serde_json::to_string_pretty(&parsed).map_err(|e| e.to_string())
        } else {
            Ok(data)
        }
    }).await.map_err(|e| e.to_string())??;

    tokio::fs::write(&path_clone, content).await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn check_master_lock(state: State<AppState>) -> Result<bool, String> {
    let path = state.path.lock().unwrap();
    let content = match std::fs::read_to_string(&*path) {
        Ok(c) => c,
        Err(_) => return Ok(false),
    };

    let data: serde_json::Value = serde_json::from_str(&content)
        .map_err(|e| e.to_string())?;

    Ok(data.get("master_hash").and_then(|v| v.as_str()).is_some()
        && !data.get("master_hash").unwrap().as_str().unwrap().is_empty())
}

#[tauri::command]
async fn setup_master_password(password: String, state: State<'_, AppState>) -> Result<(), String> {
    let path = {
        let path_guard = state.path.lock().unwrap();
        path_guard.clone()
    };

    let content = match tokio::fs::read_to_string(&path).await {
        Ok(c) => c,
        Err(_) => r#"{"sections":[]}"#.to_string(),
    };

    let mut data: serde_json::Value = serde_json::from_str(&content)
        .map_err(|e| e.to_string())?;

    let path_clone = path.clone();
    let password_clone = password.clone();

    let result = tokio::task::spawn_blocking(move || {
        let (hash, salt) = crypto::hash_password(&password_clone);
        let encryption_salt = crypto::generate_encryption_salt();

        data["master_hash"] = serde_json::Value::String(hash);
        data["salt"] = serde_json::Value::String(salt);
        data["encryption_salt"] = serde_json::Value::String(encryption_salt.clone());

        let enc_key = crypto::derive_encryption_key(&password_clone, &encryption_salt)
            .map_err(|e| e.to_string())?;

        if !is_already_encrypted(&data, &enc_key) {
            if let Some(sections) = data.get("sections") {
                data["sections"] = encrypt_sections(sections, &enc_key)?;
            }
        }

        let updated = serde_json::to_string_pretty(&data)
            .map_err(|e| e.to_string())?;
        std::fs::write(&path_clone, updated)
            .map_err(|e| e.to_string())?;

        Ok::<_, String>(enc_key)
    }).await.map_err(|e| e.to_string())??;

    let mut key_guard = state.encryption_key.lock().unwrap();
    *key_guard = Some(result);

    Ok(())
}

#[tauri::command]
async fn verify_master_password(password: String, state: State<'_, AppState>) -> Result<bool, String> {
    let path = {
        let path_guard = state.path.lock().unwrap();
        path_guard.clone()
    };

    let content = tokio::fs::read_to_string(&path).await
        .map_err(|e| e.to_string())?;

    let data: serde_json::Value = serde_json::from_str(&content)
        .map_err(|e| e.to_string())?;

    let hash = data.get("master_hash")
        .and_then(|v| v.as_str())
        .ok_or("Master password not set")?
        .to_string();

    let salt = data.get("salt")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    let enc_salt = data.get("encryption_salt")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let path_clone = path.clone();
    let password_clone = password.clone();
    let data_clone = data.clone();

    let result = tokio::task::spawn_blocking(move || {
        match enc_salt {
            Some(es) => {
                let password_v = password_clone.clone();
                let hash_v = hash.clone();
                let salt_v = salt.clone();
                let _es_v = es.clone();

                let verify_handle = std::thread::spawn(move || {
                    crypto::verify_password(&password_v, &hash_v, &salt_v)
                });

                let enc_key = crypto::derive_encryption_key(&password_clone, &es)
                    .map_err(|e| e.to_string())?;

                let valid = verify_handle.join().unwrap_or(false);
                if !valid {
                    return Ok::<_, String>((false, None));
                }
                Ok((true, Some(enc_key)))
            }
            None => {
                let valid = crypto::verify_password(&password_clone, &hash, &salt);
                if !valid {
                    return Ok((false, None));
                }

                let new_salt = crypto::generate_encryption_salt();
                let enc_key = crypto::derive_encryption_key(&password_clone, &new_salt)
                    .map_err(|e| e.to_string())?;

                let mut data = data_clone;
                data["encryption_salt"] = serde_json::Value::String(new_salt);

                if !is_already_encrypted(&data, &enc_key) {
                    if let Some(sections) = data.get("sections") {
                        data["sections"] = encrypt_sections(sections, &enc_key)?;
                    }
                }

                let updated = serde_json::to_string_pretty(&data)
                    .map_err(|e| e.to_string())?;
                std::fs::write(&path_clone, updated)
                    .map_err(|e| e.to_string())?;

                Ok((true, Some(enc_key)))
            }
        }
    }).await.map_err(|e| e.to_string())??;

    if result.0 {
        if let Some(enc_key) = result.1 {
            let mut key_guard = state.encryption_key.lock().unwrap();
            *key_guard = Some(enc_key);
        }
    }

    Ok(result.0)
}

#[tauri::command]
fn generate_recovery_key_command() -> Result<String, String> {
    Ok(crypto::generate_recovery_key())
}

#[tauri::command]
async fn setup_master_password_with_recovery(
    password: String,
    recovery_key: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let path = {
        let path_guard = state.path.lock().unwrap();
        path_guard.clone()
    };

    let content = match tokio::fs::read_to_string(&path).await {
        Ok(c) => c,
        Err(_) => r#"{"sections":[]}"#.to_string(),
    };

    let mut data: serde_json::Value = serde_json::from_str(&content)
        .map_err(|e| e.to_string())?;

    let path_clone = path.clone();
    let password_clone = password.clone();
    let recovery_key_clone = recovery_key.clone();

    let result = tokio::task::spawn_blocking(move || {
        let password_clone2 = password_clone.clone();
        let recovery_key_clone2 = recovery_key_clone.clone();

        let password_handle = std::thread::spawn(move || {
            crypto::hash_password(&password_clone2)
        });

        let recovery_handle = std::thread::spawn(move || {
            crypto::hash_recovery_key(&recovery_key_clone2)
        });

        let (hash, salt) = password_handle.join().map_err(|e| format!("Thread error: {:?}", e))?;
        let (recovery_hash, recovery_salt) = recovery_handle.join().map_err(|e| format!("Thread error: {:?}", e))?;
        let encryption_salt = crypto::generate_encryption_salt();

        data["master_hash"] = serde_json::Value::String(hash);
        data["salt"] = serde_json::Value::String(salt);
        data["recovery_key_hash"] = serde_json::Value::String(recovery_hash);
        data["recovery_key_salt"] = serde_json::Value::String(recovery_salt);
        data["encryption_salt"] = serde_json::Value::String(encryption_salt.clone());

        let enc_key = crypto::derive_encryption_key(&password_clone, &encryption_salt)
            .map_err(|e| e.to_string())?;

        if !is_already_encrypted(&data, &enc_key) {
            if let Some(sections) = data.get("sections") {
                data["sections"] = encrypt_sections(sections, &enc_key)?;
            }
        }

        let updated = serde_json::to_string_pretty(&data)
            .map_err(|e| e.to_string())?;
        std::fs::write(&path_clone, updated)
            .map_err(|e| e.to_string())?;

        Ok::<_, String>(enc_key)
    }).await.map_err(|e| e.to_string())??;

    let mut key_guard = state.encryption_key.lock().unwrap();
    *key_guard = Some(result);

    Ok(())
}

#[tauri::command]
async fn reset_master_password(
    recovery_key: String,
    new_password: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let path = {
        let path_guard = state.path.lock().unwrap();
        path_guard.clone()
    };

    let content = match tokio::fs::read_to_string(&path).await {
        Ok(c) => c,
        Err(_) => return Err("Файл данных не найден".to_string()),
    };

    let mut data: serde_json::Value = serde_json::from_str(&content)
        .map_err(|e| e.to_string())?;

    let recovery_hash = data.get("recovery_key_hash")
        .and_then(|v| v.as_str())
        .ok_or("Recovery key not configured")?
        .to_string();

    let recovery_salt = data.get("recovery_key_salt")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    let old_enc_key = {
        let key_guard = state.encryption_key.lock().unwrap();
        *key_guard
    };

    let has_encryption = data.get("encryption_salt")
        .and_then(|v| v.as_str())
        .is_some();

    if has_encryption && old_enc_key.is_none() {
        return Err("Ключ шифрования не в памяти. Войдите в приложение перед сбросом пароля.".to_string());
    }

    let path_clone = path.clone();
    let recovery_key_clone = recovery_key.clone();
    let new_password_clone = new_password.clone();

    let result = tokio::task::spawn_blocking(move || {
        if !crypto::verify_recovery_key(&recovery_key_clone, &recovery_hash, &recovery_salt) {
            return Err("Неверный ключ восстановления".to_string());
        }

        if has_encryption {
            if let Some(old_key) = old_enc_key {
                if let Some(sections) = data.get("sections") {
                    data["sections"] = decrypt_sections(sections, &old_key)?;
                }
            }
        }

        let (hash, salt) = crypto::hash_password(&new_password_clone);
        let new_encryption_salt = crypto::generate_encryption_salt();

        data["master_hash"] = serde_json::Value::String(hash);
        data["salt"] = serde_json::Value::String(salt);
        data["encryption_salt"] = serde_json::Value::String(new_encryption_salt.clone());

        let new_enc_key = crypto::derive_encryption_key(&new_password_clone, &new_encryption_salt)
            .map_err(|e| e.to_string())?;

        if let Some(sections) = data.get("sections") {
            data["sections"] = encrypt_sections(sections, &new_enc_key)?;
        }

        let updated = serde_json::to_string_pretty(&data)
            .map_err(|e| e.to_string())?;
        std::fs::write(&path_clone, updated)
            .map_err(|e| e.to_string())?;

        Ok::<_, String>(new_enc_key)
    }).await.map_err(|e| e.to_string())??;

    let mut key_guard = state.encryption_key.lock().unwrap();
    *key_guard = Some(result);

    Ok(())
}

#[tauri::command]
fn clear_master_password(state: State<AppState>) -> Result<(), String> {
    let path = state.path.lock().unwrap();
    let content = match std::fs::read_to_string(&*path) {
        Ok(c) => c,
        Err(_) => return Ok(()),
    };

    let mut data: serde_json::Value = serde_json::from_str(&content)
        .map_err(|e| e.to_string())?;

    let old_enc_key = {
        let key_guard = state.encryption_key.lock().unwrap();
        *key_guard
    };

    if let Some(key) = old_enc_key {
        if let Some(sections) = data.get("sections") {
            data["sections"] = decrypt_sections(sections, &key)?;
        }
    }

    data.as_object_mut().unwrap().remove("master_hash");
    data.as_object_mut().unwrap().remove("salt");
    data.as_object_mut().unwrap().remove("recovery_key_hash");
    data.as_object_mut().unwrap().remove("recovery_key_salt");
    data.as_object_mut().unwrap().remove("encryption_salt");

    let updated = serde_json::to_string_pretty(&data)
        .map_err(|e| e.to_string())?;

    std::fs::write(&*path, updated)
        .map_err(|e| e.to_string())?;

    let mut key_guard = state.encryption_key.lock().unwrap();
    *key_guard = None;

    Ok(())
}

fn main() {
    let mut path = dirs::data_dir().unwrap();
    path.push("my-password-manager");
    std::fs::create_dir_all(&path).unwrap();
    path.push("data.json");

    if !path.exists() {
        std::fs::write(&path, r#"{"sections":[]}"#).unwrap();
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                window.set_focus().ok();
            }
        }))
        .manage(AppState {
            path: Mutex::new(path),
            encryption_key: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            load_data,
            save_data,
            check_master_lock,
            setup_master_password,
            verify_master_password,
            generate_recovery_key_command,
            setup_master_password_with_recovery,
            reset_master_password,
            clear_master_password,
            favicon::download_favicon
        ])
        .run(tauri::generate_context!())
        .expect("error while running app");
}
