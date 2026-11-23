# TAPAS OS — Custom Control Center


## Overview

The TAPAS OS Control Center introduces a custom system-status interface inspired by modern desktop operating systems.

It provides quick access to system information through a dedicated panel opened from the top-right status bar.

The first implementation focuses on displaying actual macOS system information rather than presenting simulated controls.

Battery status and Wi-Fi state are retrieved through native macOS commands, while unsupported controls are clearly identified as macOS-managed or unavailable.

## Features

### Custom Control Center

- Custom Control Center interface.
- Opens from the top-right status bar.
- Integrated into the TAPAS OS desktop environment.
- Centralized system-status presentation.

### Live Date and Time

- Live date and time in the top status bar.
- Live date and time inside the Control Center.
- Automatically updated display.

### Battery Monitoring

Retrieves actual macOS battery information using:

```bash
pmset -g batt
```

Displays:
- Battery percentage.
- Current power state.
- Available charging information from macOS.

### Wi-Fi Status

Retrieves the actual macOS Wi-Fi enabled/disabled state using:

```bash
networksetup
```

The Control Center reflects the system's Wi-Fi state rather than using a simulated toggle.

## Feature Availability

| Feature | Current Status | Implementation |
|---|---|---|
| Control Center | Available | Custom React UI |
| Live Date and Time | Available | Live status display |
| Battery Percentage | Available | `pmset -g batt` |
| Power State | Available | macOS battery information |
| Wi-Fi State | Available | `networksetup` |
| Bluetooth | Unavailable | Additional native integration required |
| Airplane Mode | Unavailable | Additional native integration required |
| Brightness | Unavailable | Additional native integration required |
| Volume | Unavailable | Additional native integration required |

**Important:** Bluetooth, Airplane Mode, brightness, and volume are intentionally not implemented as functional toggles in this first release. They are shown as macOS-managed or unavailable.

No fake system controls are presented as working features.

## Architecture

The implementation uses the existing TAPAS OS frontend and Tauri native backend.

| Component | Responsibility |
|---|---|
| React | Control Center interface |
| TypeScript | Frontend functionality |
| Rust | Native system integration |
| Tauri Commands | Communication with native system operations |
| macOS Utilities | Battery and Wi-Fi status retrieval |

## Installation

### Requirements

- macOS
- Node.js and npm
- Rust toolchain and Cargo
- Existing TAPAS OS project
- Tauri development dependencies

Documentation:
- [Node.js](https://nodejs.org/)
- [Rust](https://www.rust-lang.org/tools/install)
- [Tauri](https://v2.tauri.app/)

### 1. Navigate to the Project

Open Terminal:

```bash
cd ~/TAPAS_OS/tapas-desktop
```

### 2. Create a Backup

Before applying the update, back up the existing files:

```bash
cp src/App.tsx src/App.tsx.before-control-center
cp src/App.css src/App.css.before-control-center
cp src-tauri/src/lib.rs src-tauri/src/lib.rs.before-control-center
cp src-tauri/src/commands/mod.rs src-tauri/src/commands/mod.rs.before-control-center
```

These backups help you restore the previous implementation if necessary.

### 3. Apply the Patch

Replace the following existing files with the versions supplied in the patch:

```text
src/App.tsx
src/App.css
src-tauri/src/lib.rs
src-tauri/src/commands/mod.rs
```

Add the new Rust command file:

```text
src-tauri/src/commands/system.rs
```

Keep the existing project structure intact.

### 4. Verify Dependencies

If TypeScript reports:

```text
Cannot find module '@tauri-apps/api/core'
```

Check whether `@tauri-apps/api` is installed in the existing project before proceeding.

Do not modify unrelated project configuration files without verifying their requirements.

### 5. Build and Verify

Build the frontend:

```bash
npm run build
```

Check Rust compilation:

```bash
cargo check --manifest-path src-tauri/Cargo.toml
```

Launch TAPAS OS:

```bash
npm run tauri dev
```

## Project File Changes

This patch modifies the following files:

```text
src/
├── App.tsx
└── App.css

src-tauri/
└── src/
    ├── lib.rs
    └── commands/
        ├── mod.rs
        └── system.rs
```

### Files Not Modified

The source ZIP did not include the following files:

- `package.json`
- `src/Settings.tsx`
- `tauri.conf.json`
- Tauri capability configuration

Therefore, this patch does not modify the existing Settings application screen or assume permissions that were not supplied in the source archive.

## Design Philosophy

The TAPAS OS Control Center follows three principles:

1. **Accuracy:** Display actual system information wherever native integration is available.
2. **Transparency:** Clearly identify features that are unavailable.
3. **Extensibility:** Keep the architecture open for additional native macOS integrations.

## Future Development

Potential improvements include:

- Native Bluetooth status and controls.
- Airplane Mode integration where supported.
- Display brightness controls.
- System volume controls.
- Improved system monitoring.
- Expanded Control Center customization.

These are future development possibilities, not currently implemented features.

## Compatibility Notes

This patch specifically targets macOS system information through native macOS utilities.

The availability and behavior of these system integrations on Windows and Linux have not been established by this patch.

## License

Use the license declared by the main TAPAS OS repository. If the project does not yet have a license, add one after deciding the project's licensing terms.

---

<p align="center">
  <strong>TAPAS OS — Building a smarter desktop experience.</strong>
  <br/>
  <sub>Accurate system information. Transparent controls. Native integration.</sub>
</p>
