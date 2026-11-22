use futures_util::StreamExt;
use serde::Serialize;
use std::collections::HashSet;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter, Manager, State};
use tokio::io::AsyncWriteExt;
use tokio::sync::Mutex;

#[derive(Default)]
pub struct DownloadState {
    cancelled: Mutex<HashSet<String>>,
}

#[derive(Clone, Serialize)]
struct DownloadProgress {
    id: String,
    filename: String,
    downloaded: u64,
    total: Option<u64>,
    percent: Option<f64>,
    status: String,
    error: Option<String>,
}

fn safe_id(id: &str) -> Result<(), String> {
    if id.is_empty()
        || id.len() > 80
        || !id.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
    {
        return Err("Invalid download ID".into());
    }
    Ok(())
}

fn safe_filename(value: &str) -> String {
    let name: String = value
        .chars()
        .filter(|c| c.is_ascii_alphanumeric() || matches!(c, '.' | '-' | '_'))
        .take(100)
        .collect();

    if name.is_empty() || name == "." || name == ".." {
        "download.bin".into()
    } else {
        name
    }
}

#[tauri::command]
pub async fn start_download(
    app: AppHandle,
    state: State<'_, DownloadState>,
    id: String,
    url: String,
) -> Result<(), String> {
    safe_id(&id)?;

    let parsed = url::Url::parse(&url).map_err(|_| "Invalid URL".to_string())?;

    if !matches!(parsed.scheme(), "http" | "https") {
        return Err("Only HTTP and HTTPS downloads are supported".into());
    }

    state.cancelled.lock().await.remove(&id);

    let response = reqwest::Client::new()
        .get(parsed.clone())
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err(format!("Server returned HTTP {}", response.status()));
    }

    let total = response.content_length();

    let original_name = parsed
        .path_segments()
        .and_then(|segments| segments.last())
        .filter(|name| !name.is_empty())
        .unwrap_or("download.bin");

    let filename = safe_filename(original_name);

    let download_dir = app.path()
        .download_dir()
        .map_err(|e| e.to_string())?;

    tokio::fs::create_dir_all(&download_dir)
        .await
        .map_err(|e| e.to_string())?;

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();

    let final_name = format!("{timestamp}-{filename}");
    let destination = download_dir.join(&final_name);

    let mut file = tokio::fs::File::create(&destination)
        .await
        .map_err(|e| e.to_string())?;

    let mut stream = response.bytes_stream();
    let mut downloaded = 0_u64;

    while let Some(chunk_result) = stream.next().await {
        let cancelled = state.cancelled.lock().await.contains(&id);

        if cancelled {
            drop(file);
            let _ = tokio::fs::remove_file(&destination).await;

            let _ = app.emit("download-progress", DownloadProgress {
                id: id.clone(),
                filename: final_name.clone(),
                downloaded,
                total,
                percent: None,
                status: "cancelled".into(),
                error: None,
            });

            state.cancelled.lock().await.remove(&id);
            return Ok(());
        }

        let chunk = match chunk_result {
            Ok(chunk) => chunk,
            Err(error) => {
                drop(file);
                let _ = tokio::fs::remove_file(&destination).await;

                let _ = app.emit("download-progress", DownloadProgress {
                    id: id.clone(),
                    filename: final_name.clone(),
                    downloaded,
                    total,
                    percent: None,
                    status: "failed".into(),
                    error: Some(error.to_string()),
                });

                return Err(error.to_string());
            }
        };

        file.write_all(&chunk)
            .await
            .map_err(|e| e.to_string())?;

        downloaded += chunk.len() as u64;

        let percent = total.map(|size| {
            if size == 0 { 0.0 } else {
                (downloaded as f64 / size as f64 * 100.0).min(100.0)
            }
        });

        let _ = app.emit("download-progress", DownloadProgress {
            id: id.clone(),
            filename: final_name.clone(),
            downloaded,
            total,
            percent,
            status: "downloading".into(),
            error: None,
        });
    }

    file.flush().await.map_err(|e| e.to_string())?;

    let _ = app.emit("download-progress", DownloadProgress {
        id: id.clone(),
        filename: final_name.clone(),
        downloaded,
        total,
        percent: Some(100.0),
        status: "completed".into(),
        error: None,
    });

    state.cancelled.lock().await.remove(&id);

    Ok(())
}

#[tauri::command]
pub async fn cancel_download(
    state: State<'_, DownloadState>,
    id: String,
) -> Result<(), String> {
    safe_id(&id)?;
    state.cancelled.lock().await.insert(id);
    Ok(())
}
