use serde::Serialize;
use std::process::Command;

#[tauri::command]
pub fn open_macos_system_settings() -> Result<(), String> {
    Command::new("open")
        .args(["-a", "System Settings"])
        .spawn()
        .map(|_| ())
        .map_err(|error| format!("Could not open macOS System Settings: {error}"))
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemStatus {
    battery_percent: Option<u8>,
    battery_state: String,
    wifi_enabled: Option<bool>,
}

#[tauri::command]
pub fn get_system_status() -> SystemStatus {
    SystemStatus {
        battery_percent: read_battery_percent(),
        battery_state: read_battery_state(),
        wifi_enabled: read_wifi_state(),
    }
}

fn read_battery_output() -> Option<String> {
    let output = Command::new("pmset").args(["-g", "batt"]).output().ok()?;
    if !output.status.success() {
        return None;
    }
    Some(String::from_utf8_lossy(&output.stdout).to_string())
}

fn read_battery_percent() -> Option<u8> {
    let output = read_battery_output()?;
    let marker = output.find('%')?;
    let digits: String = output[..marker]
        .chars()
        .rev()
        .take_while(|character| character.is_ascii_digit())
        .collect::<String>()
        .chars()
        .rev()
        .collect();
    digits.parse::<u8>().ok().filter(|value| *value <= 100)
}

fn read_battery_state() -> String {
    let Some(output) = read_battery_output() else {
        return "Unavailable".to_string();
    };
    let lower = output.to_lowercase();
    if lower.contains("charging") {
        "Charging".to_string()
    } else if lower.contains("charged") {
        "Charged".to_string()
    } else if lower.contains("discharging") {
        "On battery".to_string()
    } else {
        "Power status unknown".to_string()
    }
}

fn read_wifi_state() -> Option<bool> {
    let hardware = Command::new("networksetup")
        .arg("-listallhardwareports")
        .output()
        .ok()?;
    if !hardware.status.success() {
        return None;
    }

    let text = String::from_utf8_lossy(&hardware.stdout);
    let lines: Vec<&str> = text.lines().collect();
    let mut wifi_device: Option<&str> = None;

    for (index, line) in lines.iter().enumerate() {
        if line.trim() == "Hardware Port: Wi-Fi" {
            for candidate in lines.iter().skip(index + 1).take(3) {
                if let Some(device) = candidate.trim().strip_prefix("Device: ") {
                    wifi_device = Some(device);
                    break;
                }
            }
            break;
        }
    }

    let device = wifi_device?;
    let result = Command::new("networksetup")
        .args(["-getairportpower", device])
        .output()
        .ok()?;
    if !result.status.success() {
        return None;
    }

    let state = String::from_utf8_lossy(&result.stdout).to_lowercase();
    if state.contains(": on") {
        Some(true)
    } else if state.contains(": off") {
        Some(false)
    } else {
        None
    }
}
