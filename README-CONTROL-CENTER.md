# TAPAS OS — Control Center update

This patch adds:
- A custom TAPAS Control Center opened from the top-right status bar.
- Live date/time in the top bar and Control Center.
- Actual macOS battery percentage and power state via `pmset -g batt`.
- Actual macOS Wi-Fi enabled/disabled state via `networksetup`.

Bluetooth, Airplane Mode, brightness and volume are intentionally shown as macOS-managed/unavailable in this first pass. They are not fake toggles; changing those settings requires additional native macOS integration and permissions.

## Apply the update

From the project root (`~/TAPAS_OS/tapas-desktop`), make a backup first:

```bash
cp src/App.tsx src/App.tsx.before-control-center
cp src/App.css src/App.css.before-control-center
cp src-tauri/src/lib.rs src-tauri/src/lib.rs.before-control-center
cp src-tauri/src/commands/mod.rs src-tauri/src/commands/mod.rs.before-control-center
```

Replace the matching files from this patch:
- `src/App.tsx`
- `src/App.css`
- `src-tauri/src/lib.rs`
- `src-tauri/src/commands/mod.rs`

Copy the new file:
- `src-tauri/src/commands/system.rs`

Then run:

```bash
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
npm run tauri dev
```

If TypeScript reports that `@tauri-apps/api/core` cannot be resolved, check that `@tauri-apps/api` is installed in the existing project before proceeding.

## Notes

This patch is based on the source files included in the uploaded ZIP. The ZIP did not include `package.json`, `src/Settings.tsx`, `tauri.conf.json`, or capability configuration, so this patch does not modify the existing Settings application screen or assume any unprovided permissions.
