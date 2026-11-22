
use serde::Serialize;
use std::fs::{self, OpenOptions};
use std::io::ErrorKind;
use std::path::{Component, Path, PathBuf};

// File information returned to the frontend.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub is_file: bool,
    pub size: u64,
    pub modified: Option<u64>,
}

// Get the user's Home directory.
fn home_directory() -> Result<PathBuf, String> {
    let home = std::env::var_os("HOME")
        .ok_or_else(|| "Home directory not found".to_string())?;

    fs::canonicalize(PathBuf::from(home))
        .map_err(|e| format!("Cannot access Home directory: {e}"))
}

// Accept only relative paths.
fn validate_relative_path(path: &str) -> Result<PathBuf, String> {
    let relative = Path::new(path);

    if relative.is_absolute() {
        return Err("Absolute paths are not allowed".to_string());
    }

    for component in relative.components() {
        match component {
            Component::Normal(_) => {}
            _ => return Err("Invalid path".to_string()),
        }
    }

    Ok(relative.to_path_buf())
}

// Reject symbolic links in a path.
fn ensure_no_symlinks(path: &Path) -> Result<(), String> {
    let mut current = PathBuf::new();

    for component in path.components() {
        current.push(component);

        let metadata = fs::symlink_metadata(&current)
            .map_err(|e| format!("Cannot inspect path: {e}"))?;

        if metadata.file_type().is_symlink() {
            return Err("Symbolic links are not allowed".to_string());
        }
    }

    Ok(())
}

// Resolve an existing path inside Home.
fn resolve_existing(path: &str) -> Result<PathBuf, String> {
    let home = home_directory()?;
    let relative = validate_relative_path(path)?;
    let candidate = home.join(relative);

    ensure_no_symlinks(&candidate)?;

    let target = fs::canonicalize(candidate)
        .map_err(|e| format!("Cannot access path: {e}"))?;

    if !target.starts_with(&home) {
        return Err("Access outside Home directory is not allowed".to_string());
    }

    Ok(target)
}

// Resolve the destination of a new file or folder.
fn resolve_new_path(path: &str) -> Result<PathBuf, String> {
    let home = home_directory()?;
    let relative = validate_relative_path(path)?;

    if relative.as_os_str().is_empty() {
        return Err("A file or folder name is required".to_string());
    }

    let name = relative
        .file_name()
        .ok_or_else(|| "Invalid name".to_string())?;

    let parent = relative.parent().unwrap_or(Path::new(""));
    let parent_candidate = home.join(parent);

    ensure_no_symlinks(&parent_candidate)?;

    let parent_path = fs::canonicalize(parent_candidate)
        .map_err(|e| format!("Cannot access parent folder: {e}"))?;

    if !parent_path.starts_with(&home) {
        return Err("Access outside Home directory is not allowed".to_string());
    }

    Ok(parent_path.join(name))
}

// List files and folders.
#[tauri::command]
pub fn list_directory(path: Option<String>) -> Result<Vec<FileEntry>, String> {
    let relative = path.unwrap_or_default();
    let directory = resolve_existing(&relative)?;

    if !directory.is_dir() {
        return Err("The selected path is not a folder".to_string());
    }

    let mut entries = Vec::new();

    let items = fs::read_dir(&directory)
        .map_err(|e| format!("Cannot read folder: {e}"))?;

    for item in items {
        let item = item.map_err(|e| e.to_string())?;
        let item_path = item.path();

        if item.file_name().to_string_lossy() == ".tapas_os_trash" {
            continue;
        }

        let file_type = item.file_type()
            .map_err(|e| e.to_string())?;

        // Skip symbolic links.
        if file_type.is_symlink() {
            continue;
        }

        let metadata = item.metadata()
            .map_err(|e| e.to_string())?;

        let home = home_directory()?;

        let relative_path = item_path
            .strip_prefix(&home)
            .map_err(|_| "Invalid file path".to_string())?
            .to_string_lossy()
            .replace('\\', "/");

        let modified = metadata
            .modified()
            .ok()
            .and_then(|time| {
                time.duration_since(std::time::UNIX_EPOCH).ok()
            })
            .map(|duration| duration.as_secs());

        entries.push(FileEntry {
            name: item.file_name().to_string_lossy().to_string(),
            path: relative_path,
            is_dir: file_type.is_dir(),
            is_file: file_type.is_file(),
            size: metadata.len(),
            modified,
        });
    }

    // Folders first, then files alphabetically.
    entries.sort_by(|a, b| {
        b.is_dir
            .cmp(&a.is_dir)
            .then_with(|| {
                a.name.to_lowercase().cmp(&b.name.to_lowercase())
            })
    });

    Ok(entries)
}

// Create a new folder.
#[tauri::command]
pub fn create_folder(path: String) -> Result<(), String> {
    let target = resolve_new_path(&path)?;

    if target.exists() {
        return Err("A file or folder with this name already exists".to_string());
    }

    fs::create_dir(&target)
        .map_err(|e| format!("Cannot create folder: {e}"))
}

// Create a new empty file.
#[tauri::command]
pub fn create_file(path: String) -> Result<(), String> {
    let target = resolve_new_path(&path)?;

    let mut file = OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&target)
        .map_err(|e| {
            if e.kind() == ErrorKind::AlreadyExists {
                "A file or folder with this name already exists".to_string()
            } else {
                format!("Cannot create file: {e}")
            }
        })?;

    use std::io::Write;
    file.flush()
        .map_err(|e| format!("Cannot finish creating file: {e}"))?;

    Ok(())
}

// Rename a file or folder.
#[tauri::command]
pub fn rename_entry(path: String, new_name: String) -> Result<(), String> {
    let source = resolve_existing(&path)?;

    if source == home_directory()? {
        return Err("Cannot rename the Home directory".to_string());
    }

    let name_path = Path::new(&new_name);

    if new_name.trim().is_empty()
        || name_path.components().count() != 1
        || !matches!(
            name_path.components().next(),
            Some(Component::Normal(_))
        )
    {
        return Err("Please provide a valid new name".to_string());
    }

    let source_info = fs::symlink_metadata(&source)
        .map_err(|e| e.to_string())?;

    if source_info.file_type().is_symlink() {
        return Err("Symbolic links cannot be renamed".to_string());
    }

    let parent = source
        .parent()
        .ok_or_else(|| "Invalid parent folder".to_string())?;

    let destination = parent.join(new_name);

    if destination.exists() {
        return Err("A file or folder with this name already exists".to_string());
    }

    fs::rename(&source, &destination)
        .map_err(|e| format!("Cannot rename item: {e}"))
}

// Move an item into the persistent application Recycle Bin.
#[tauri::command]
pub fn delete_entry(path: String) -> Result<(), String> {
    let source = resolve_existing(&path)?;
    let home = home_directory()?;

    if source == home {
        return Err("Cannot delete the Home directory".to_string());
    }

    if source.file_name().is_some_and(|n| n == ".tapas_os_trash") {
        return Err("Cannot delete the Recycle Bin directory".to_string());
    }

    let metadata = fs::symlink_metadata(&source)
        .map_err(|e| format!("Cannot inspect item: {e}"))?;

    if metadata.file_type().is_symlink() {
        return Err("Symbolic links cannot be deleted".to_string());
    }

    let trash = trash_directory()?;
    let id = unique_trash_id();
    let payload = trash.join(&id);
    let manifest = trash.join(format!("{id}.json"));

    let entry = TrashEntry {
        id: id.clone(),
        name: source.file_name()
            .ok_or_else(|| "Invalid item name".to_string())?
            .to_string_lossy().to_string(),
        original_path: path.clone(),
        deleted_at: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default().as_secs(),
        is_dir: metadata.is_dir(),
        size: metadata.len(),
    };

    fs::rename(&source, &payload)
        .map_err(|e| format!("Cannot move item to Recycle Bin: {e}"))?;

    let json = serde_json::to_vec_pretty(&entry)
        .map_err(|e| format!("Cannot create Recycle Bin record: {e}"))?;

    if let Err(error) = fs::write(&manifest, json) {
        let _ = fs::rename(&payload, &source);
        return Err(format!("Cannot save Recycle Bin record: {error}"));
    }

    Ok(())
}



// Read a text file for in-app preview (maximum 1 MB).
#[tauri::command]
pub fn read_file(path: String) -> Result<String, String> {
    let target = resolve_existing(&path)?;

    if !target.is_file() {
        return Err("The selected item is not a file".to_string());
    }

    let metadata = fs::metadata(&target)
        .map_err(|e| format!("Cannot inspect file: {e}"))?;

    if metadata.len() > 1_048_576 {
        return Err("Preview is limited to files smaller than 1 MB".to_string());
    }

    fs::read_to_string(&target)
        .map_err(|e| format!("Cannot preview this file as UTF-8 text: {e}"))
}


#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StorageInfo {
    pub total: u64,
    pub available: u64,
    pub used: u64,
}

#[tauri::command]
pub fn get_storage_info() -> Result<StorageInfo, String> {
    let home = home_directory()?;
    let output = std::process::Command::new("df")
        .arg("-k")
        .arg(&home)
        .output()
        .map_err(|e| format!("Cannot read storage information: {e}"))?;

    if !output.status.success() {
        return Err("Storage information is unavailable".to_string());
    }

    let text = String::from_utf8_lossy(&output.stdout);
    let line = text.lines().last()
        .ok_or_else(|| "Storage information is unavailable".to_string())?;
    let columns: Vec<&str> = line.split_whitespace().collect();

    if columns.len() < 4 {
        return Err("Unexpected storage information format".to_string());
    }

    let total = columns[1].parse::<u64>()
        .map_err(|_| "Cannot parse total storage".to_string())? * 1024;
    let available = columns[3].parse::<u64>()
        .map_err(|_| "Cannot parse available storage".to_string())? * 1024;

    Ok(StorageInfo {
        total,
        available,
        used: total.saturating_sub(available),
    })
}


// Recycle Bin records.
#[derive(serde::Serialize, serde::Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TrashEntry {
    pub id: String,
    pub name: String,
    pub original_path: String,
    pub deleted_at: u64,
    pub is_dir: bool,
    pub size: u64,
}

fn trash_directory() -> Result<PathBuf, String> {
    let directory = home_directory()?.join(".tapas_os_trash");
    fs::create_dir_all(&directory)
        .map_err(|e| format!("Cannot open Recycle Bin: {e}"))?;
    Ok(directory)
}

fn unique_trash_id() -> String {
    let time = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    format!("{time}")
}

#[tauri::command]
pub fn list_trash() -> Result<Vec<TrashEntry>, String> {
    let directory = trash_directory()?;
    let mut entries = Vec::new();

    for item in fs::read_dir(directory).map_err(|e| e.to_string())? {
        let item = item.map_err(|e| e.to_string())?;
        let path = item.path();

        if path.extension().is_some_and(|ext| ext == "json") {
            let content = fs::read(&path)
                .map_err(|e| format!("Cannot read Recycle Bin record: {e}"))?;
            let entry: TrashEntry = serde_json::from_slice(&content)
                .map_err(|e| format!("Invalid Recycle Bin record: {e}"))?;
            entries.push(entry);
        }
    }

    entries.sort_by(|a, b| b.deleted_at.cmp(&a.deleted_at));
    Ok(entries)
}

#[tauri::command]
pub fn restore_entry(id: String) -> Result<(), String> {
    if id.is_empty() || !id.chars().all(|c| c.is_ascii_digit()) {
        return Err("Invalid Recycle Bin item ID".to_string());
    }

    let trash = trash_directory()?;
    let payload = trash.join(&id);
    let manifest = trash.join(format!("{id}.json"));

    let content = fs::read(&manifest)
        .map_err(|e| format!("Cannot read Recycle Bin record: {e}"))?;
    let entry: TrashEntry = serde_json::from_slice(&content)
        .map_err(|e| format!("Invalid Recycle Bin record: {e}"))?;

    let destination = resolve_new_path(&entry.original_path)?;

    if destination.exists() {
        return Err("The original location already contains an item with this name. Rename or move it first.".to_string());
    }

    fs::rename(&payload, &destination)
        .map_err(|e| format!("Cannot restore item: {e}"))?;

    fs::remove_file(&manifest)
        .map_err(|e| format!("Restored, but could not remove Recycle Bin record: {e}"))?;

    Ok(())
}

#[tauri::command]
pub fn permanently_delete_entry(id: String) -> Result<(), String> {
    if id.is_empty() || !id.chars().all(|c| c.is_ascii_digit()) {
        return Err("Invalid Recycle Bin item ID".to_string());
    }

    let trash = trash_directory()?;
    let payload = trash.join(&id);
    let manifest = trash.join(format!("{id}.json"));

    if !manifest.is_file() {
        return Err("Recycle Bin item not found".to_string());
    }

    if payload.is_dir() {
        fs::remove_dir_all(&payload)
            .map_err(|e| format!("Cannot permanently delete folder: {e}"))?;
    } else if payload.exists() {
        fs::remove_file(&payload)
            .map_err(|e| format!("Cannot permanently delete file: {e}"))?;
    }

    fs::remove_file(&manifest)
        .map_err(|e| format!("Cannot remove Recycle Bin record: {e}"))?;

    Ok(())
}

#[tauri::command]
pub fn empty_trash() -> Result<(), String> {
    let entries = list_trash()?;

    for entry in entries {
        permanently_delete_entry(entry.id)?;
    }

    Ok(())
}

// Copy files and directories without following symbolic links.
fn copy_item(source: &Path, destination: &Path) -> Result<(), String> {
    let metadata = fs::symlink_metadata(source)
        .map_err(|e| format!("Cannot inspect source: {e}"))?;

    if metadata.file_type().is_symlink() {
        return Err("Symbolic links cannot be copied".to_string());
    }

    if metadata.is_dir() {
        fs::create_dir(destination)
            .map_err(|e| format!("Cannot create destination folder: {e}"))?;

        for item in fs::read_dir(source).map_err(|e| e.to_string())? {
            let item = item.map_err(|e| e.to_string())?;
            let file_type = item.file_type().map_err(|e| e.to_string())?;

            if file_type.is_symlink() {
                continue;
            }

            copy_item(&item.path(), &destination.join(item.file_name()))?;
        }
    } else {
        fs::copy(source, destination)
            .map_err(|e| format!("Cannot copy file: {e}"))?;
    }

    Ok(())
}

#[tauri::command]
pub fn copy_entry(path: String, destination: String) -> Result<(), String> {
    let source = resolve_existing(&path)?;
    let target = resolve_new_path(&destination)?;

    if source == home_directory()? {
        return Err("Cannot copy the Home directory".to_string());
    }

    if target.exists() {
        return Err("An item with this name already exists".to_string());
    }

    if source.is_dir() && target.starts_with(&source) {
        return Err("Cannot copy a folder into itself".to_string());
    }

    copy_item(&source, &target)
}

#[tauri::command]
pub fn move_entry(path: String, destination: String) -> Result<(), String> {
    let source = resolve_existing(&path)?;
    let target = resolve_new_path(&destination)?;

    if source == home_directory()? {
        return Err("Cannot move the Home directory".to_string());
    }

    if target.exists() {
        return Err("An item with this name already exists".to_string());
    }

    if source.is_dir() && target.starts_with(&source) {
        return Err("Cannot move a folder into itself".to_string());
    }

    fs::rename(&source, &target)
        .map_err(|e| format!("Cannot move item: {e}"))
}
