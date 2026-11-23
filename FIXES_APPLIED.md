# Fixes applied to this snapshot

1. **Browser covering other windows (desktop)** - `App.tsx` now passes `visible` to `Browser`; the native view is hidden when the Browser window is minimized, not on top, or the Start Menu / Control Center is open. (`Browser.tsx`, `App.tsx`)
2. **Wrong "Sicily AI" tab title** - tabs opened from the App Store use the app's real name.
3. **Icon CSS regex** - `/\\s+/g` -> `/\s+/g`, so `.app-icon-my-files`, `.app-icon-app-store`, `.app-icon-sicily-ai` styles apply again.
4. **Installed app icons** - saved positions are restored for installed apps after restart; new icons go to the next free grid slot.
5. **AI in installed app** - `agent.rs` uses `GROQ_API_KEY` (dev) or the hosted `/api/tapas-ai` endpoint via `TAPAS_AI_URL` (runtime env or build-time GitHub secret). `api/tapas-ai.ts` accepts `client: "desktop"` and allows `open_app` for the fixed app list.
6. **AI multi-step plans** - all proposed create actions are queued and approved one by one (previously only the first was kept).
7. **Windows** - `HOME` falls back to `USERPROFILE`; storage info returns a graceful error on Windows.
8. **Web browser** - added a "open in new tab" button for sites that refuse embedding; docs corrected.
10. **App Store / Notes / Calculator / Gallery layout** - these apps now fill their window (`MiniApps.css`); before, they were squeezed into a narrow centred column and the window behind showed through.
9. **Calculator** - no more double decimal points / "." edge cases.

## Not changed (recommended later)
- `csp: null` in `src-tauri/tauri.conf.json`
- Rate limiting on `/api/tapas-ai` (Vercel Firewall or Upstash)
- Unused Rust commands `install_store_app`, `list_installed_store_apps`, `uninstall_store_app`
- 300 ms polling in the desktop browser

## Before pushing
```
npm ci
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
npm run tauri dev
```
For installed-app AI: add GitHub secret `TAPAS_AI_URL` = `https://<your-vercel-app>/api/tapas-ai`.
