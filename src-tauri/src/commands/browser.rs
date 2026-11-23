use tauri::{
    AppHandle,
    LogicalPosition,
    LogicalSize,
    Manager,
    WebviewUrl,
};
use tauri::webview::WebviewBuilder;
use tauri::webview::DownloadEvent;
use std::time::{SystemTime, UNIX_EPOCH};
use url::Url;

fn validate_label(label: &str) -> Result<(), String> {
    if !label.starts_with("browser-")
        || !label.chars().all(|c| c.is_ascii_alphanumeric() || c == '-')
    {
        return Err("Invalid browser view label".into());
    }

    Ok(())
}

fn validate_url(value: &str) -> Result<Url, String> {
    let url = Url::parse(value)
        .map_err(|_| "Invalid URL".to_string())?;

    if !matches!(url.scheme(), "http" | "https") {
        return Err("Only HTTP and HTTPS websites are allowed".into());
    }

    Ok(url)
}

#[tauri::command]
pub fn create_browser_view(
    app: AppHandle,
    label: String,
    url: String,
    x: f64,
    y: f64,
    width: f64,
    height: f64,
) -> Result<(), String> {
    validate_label(&label)?;
    let url = validate_url(&url)?;

    if width <= 0.0 || height <= 0.0 {
        return Err("Invalid browser view dimensions".into());
    }

    if app.get_webview(&label).is_some() {
        return Err("Browser view already exists".into());
    }

    let window = app
        .get_window("main")
        .ok_or("Main application window not found")?;

    let download_dir = app.path()
        .download_dir()
        .map_err(|error| error.to_string())?;

    std::fs::create_dir_all(&download_dir)
        .map_err(|error| error.to_string())?;

    let builder = WebviewBuilder::new(
        label,
        WebviewUrl::External(url),
    )
    .on_navigation(|url| {
        matches!(url.scheme(), "http" | "https")
    })
    .on_download(move |_webview, event| {
        if let DownloadEvent::Requested { url, destination } = event {
            let original_name = url.path_segments()
                .and_then(|segments| segments.last())
                .filter(|name| !name.is_empty())
                .unwrap_or("download");

            let safe_name: String = original_name
                .chars()
                .filter(|ch| {
                    ch.is_ascii_alphanumeric()
                        || matches!(ch, '.' | '-' | '_')
                })
                .take(100)
                .collect();

            let safe_name = if safe_name.is_empty() {
                "download".to_string()
            } else {
                safe_name
            };

            let timestamp = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs();

            *destination = download_dir.join(
                format!("{timestamp}-{safe_name}")
            );
        }

        true
    });

    window
        .add_child(
            builder,
            LogicalPosition::new(x, y),
            LogicalSize::new(width, height),
        )
        .map_err(|error| error.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn navigate_browser_view(
    app: AppHandle,
    label: String,
    url: String,
) -> Result<(), String> {
    validate_label(&label)?;
    let url = validate_url(&url)?;

    let webview = app
        .get_webview(&label)
        .ok_or("Browser view not found")?;

    webview
        .navigate(url)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn resize_browser_view(
    app: AppHandle,
    label: String,
    x: f64,
    y: f64,
    width: f64,
    height: f64,
) -> Result<(), String> {
    validate_label(&label)?;

    if width <= 0.0 || height <= 0.0 {
        return Err("Invalid browser view dimensions".into());
    }

    let webview = app
        .get_webview(&label)
        .ok_or("Browser view not found")?;

    webview
        .set_position(LogicalPosition::new(x, y))
        .map_err(|error| error.to_string())?;

    webview
        .set_size(LogicalSize::new(width, height))
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn close_browser_view(
    app: AppHandle,
    label: String,
) -> Result<(), String> {
    validate_label(&label)?;

    if let Some(webview) = app.get_webview(&label) {
        webview
            .close()
            .map_err(|error| error.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub fn browser_action(
    app: AppHandle,
    label: String,
    action: String,
) -> Result<(), String> {
    validate_label(&label)?;

    let webview = app
        .get_webview(&label)
        .ok_or("Browser view not found")?;

    match action.as_str() {
        "back" => webview.eval("history.back()"),

        "forward" => webview.eval("history.forward()"),

        "reload" => webview.reload(),

        "download" => webview.eval(r#"
            (() => {
                const video = document.querySelector("video");
                const mediaUrl = video?.currentSrc || video?.src;

                if (!mediaUrl || mediaUrl.startsWith("blob:")) {
                    console.warn(
                        "This page does not expose a directly downloadable media URL."
                    );
                    return;
                }

                const link = document.createElement("a");
                link.href = mediaUrl;
                link.download = "media";
                link.style.display = "none";

                document.body.appendChild(link);
                link.click();
                link.remove();
            })();
        "#),

        _ => return Err("Unsupported browser action".into()),
    }
    .map_err(|error| error.to_string())
}
