use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{fs, io::Read, path::{Component, Path, PathBuf}};
use tauri::{AppHandle, Manager};
use tokio::io::AsyncWriteExt;

const MAX_PACKAGE_BYTES: u64 = 100 * 1024 * 1024;
const MAX_EXTRACTED_BYTES: u64 = 250 * 1024 * 1024;
const MAX_ENTRIES: usize = 2_000;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstalledStoreApp {
    pub id: String,
    pub name: String,
    pub version: String,
    pub installed_at: u64,
    pub install_path: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct PackageManifest {
    id: String,
    name: String,
    version: String,
    entry: String,
}

#[derive(Default, Serialize, Deserialize)]
struct Registry {
    apps: Vec<InstalledStoreApp>,
}

fn valid_id(id: &str) -> bool {
    !id.is_empty()
        && id.len() <= 64
        && id.chars().all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-')
}

fn apps_root(app: &AppHandle) -> Result<PathBuf, String> {
    let root = app.path().app_data_dir().map_err(|e| e.to_string())?.join("store-apps");
    fs::create_dir_all(&root).map_err(|e| e.to_string())?;
    Ok(root)
}

fn registry_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(apps_root(app)?.join("registry.json"))
}

fn read_registry(app: &AppHandle) -> Result<Registry, String> {
    let path = registry_path(app)?;
    if !path.exists() {
        return Ok(Registry::default());
    }
    let bytes = fs::read(path).map_err(|e| e.to_string())?;
    serde_json::from_slice(&bytes).map_err(|e| format!("Registry is invalid: {e}"))
}

fn write_registry(app: &AppHandle, registry: &Registry) -> Result<(), String> {
    let path = registry_path(app)?;
    let temp = path.with_extension("json.tmp");
    let bytes = serde_json::to_vec_pretty(registry).map_err(|e| e.to_string())?;
    fs::write(&temp, bytes).map_err(|e| e.to_string())?;
    fs::rename(temp, path).map_err(|e| e.to_string())
}

fn sha256_file(path: &Path) -> Result<String, String> {
    let mut file = fs::File::open(path).map_err(|e| e.to_string())?;
    let mut hasher = Sha256::new();
    let mut buffer = [0u8; 64 * 1024];
    loop {
        let count = file.read(&mut buffer).map_err(|e| e.to_string())?;
        if count == 0 { break; }
        hasher.update(&buffer[..count]);
    }
    Ok(format!("{:x}", hasher.finalize()))
}

fn safe_relative_path(name: &str) -> Result<PathBuf, String> {
    let path = Path::new(name);
    if path.is_absolute() || name.contains('\\') {
        return Err("Package contains an unsafe path".into());
    }
    for component in path.components() {
        match component {
            Component::Normal(_) => {},
            _ => return Err("Package contains path traversal".into()),
        }
    }
    Ok(path.to_path_buf())
}

#[tauri::command]
pub async fn install_store_app(
    app: AppHandle,
    id: String,
    name: String,
    version: String,
    url: String,
    sha256: String,
) -> Result<InstalledStoreApp, String> {
    if !valid_id(&id) { return Err("Invalid app ID".into()); }
    if name.trim().is_empty() || name.len() > 100 { return Err("Invalid app name".into()); }
    if version.trim().is_empty() || version.len() > 40 { return Err("Invalid app version".into()); }
    if sha256.len() != 64 || !sha256.chars().all(|c| c.is_ascii_hexdigit()) {
        return Err("Invalid SHA-256 checksum".into());
    }

    let parsed = url::Url::parse(&url).map_err(|_| "Invalid package URL".to_string())?;
    if parsed.scheme() != "https" {
        return Err("App packages must be downloaded over HTTPS".into());
    }

    let root = apps_root(&app)?;
    let staging = root.join(format!(".{id}.download"));
    let response = reqwest::Client::new()
        .get(parsed)
        .send().await.map_err(|e| e.to_string())?
        .error_for_status().map_err(|e| e.to_string())?;

    if response.content_length().is_some_and(|n| n > MAX_PACKAGE_BYTES) {
        return Err("Package exceeds the 100 MB download limit".into());
    }

    let bytes = response.bytes().await.map_err(|e| e.to_string())?;
    if bytes.len() as u64 > MAX_PACKAGE_BYTES {
        return Err("Package exceeds the 100 MB download limit".into());
    }

    let mut file = tokio::fs::File::create(&staging).await.map_err(|e| e.to_string())?;
    file.write_all(&bytes).await.map_err(|e| e.to_string())?;
    file.flush().await.map_err(|e| e.to_string())?;
    drop(file);

    let actual_hash = sha256_file(&staging)?;
    if !actual_hash.eq_ignore_ascii_case(&sha256) {
        let _ = fs::remove_file(&staging);
        return Err("Package checksum does not match the catalogue".into());
    }

    let target = root.join(&id);
    let unpack = root.join(format!(".{id}.installing"));
    if unpack.exists() { fs::remove_dir_all(&unpack).map_err(|e| e.to_string())?; }
    fs::create_dir_all(&unpack).map_err(|e| e.to_string())?;

    let archive_file = fs::File::open(&staging).map_err(|e| e.to_string())?;
    let mut archive = zip::ZipArchive::new(archive_file)
        .map_err(|_| "Package is not a valid ZIP app package".to_string())?;

    if archive.len() > MAX_ENTRIES {
        let _ = fs::remove_dir_all(&unpack);
        let _ = fs::remove_file(&staging);
        return Err("Package contains too many files".into());
    }

    let mut total_unpacked = 0_u64;
    for index in 0..archive.len() {
        let mut item = archive.by_index(index).map_err(|e| e.to_string())?;
        let relative = safe_relative_path(item.name())?;
        total_unpacked = total_unpacked.saturating_add(item.size());
        if total_unpacked > MAX_EXTRACTED_BYTES {
            let _ = fs::remove_dir_all(&unpack);
            let _ = fs::remove_file(&staging);
            return Err("Extracted package exceeds the 250 MB limit".into());
        }

        let output = unpack.join(relative);
        if item.is_dir() {
            fs::create_dir_all(&output).map_err(|e| e.to_string())?;
        } else {
            if let Some(parent) = output.parent() {
                fs::create_dir_all(parent).map_err(|e| e.to_string())?;
            }
            let mut out = fs::File::create(&output).map_err(|e| e.to_string())?;
            std::io::copy(&mut item, &mut out).map_err(|e| e.to_string())?;
        }
    }

    let manifest_path = unpack.join("manifest.json");
    let manifest_bytes = fs::read(&manifest_path)
        .map_err(|_| "Package is missing manifest.json".to_string())?;
    let manifest: PackageManifest = serde_json::from_slice(&manifest_bytes)
        .map_err(|e| format!("Invalid package manifest: {e}"))?;

    if manifest.id != id || manifest.name != name || manifest.version != version {
        let _ = fs::remove_dir_all(&unpack);
        let _ = fs::remove_file(&staging);
        return Err("Package manifest does not match the catalogue entry".into());
    }

    let entry = safe_relative_path(&manifest.entry)?;
    if !unpack.join(entry).is_file() {
        let _ = fs::remove_dir_all(&unpack);
        let _ = fs::remove_file(&staging);
        return Err("Package entry file is missing".into());
    }

    if target.exists() { fs::remove_dir_all(&target).map_err(|e| e.to_string())?; }
    fs::rename(&unpack, &target).map_err(|e| e.to_string())?;
    let _ = fs::remove_file(&staging);

    let installed = InstalledStoreApp {
        id: id.clone(),
        name,
        version,
        installed_at: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_secs(),
        install_path: target.to_string_lossy().to_string(),
    };

    let mut registry = read_registry(&app)?;
    registry.apps.retain(|item| item.id != id);
    registry.apps.push(installed.clone());
    write_registry(&app, &registry)?;
    Ok(installed)
}

#[tauri::command]
pub fn list_installed_store_apps(app: AppHandle) -> Result<Vec<InstalledStoreApp>, String> {
    Ok(read_registry(&app)?.apps)
}

#[tauri::command]
pub fn uninstall_store_app(app: AppHandle, id: String) -> Result<(), String> {
    if !valid_id(&id) { return Err("Invalid app ID".into()); }
    let root = apps_root(&app)?;
    let target = root.join(&id);
    if target.exists() {
        fs::remove_dir_all(&target).map_err(|e| e.to_string())?;
    }
    let mut registry = read_registry(&app)?;
    registry.apps.retain(|item| item.id != id);
    write_registry(&app, &registry)?;
    Ok(())
}
