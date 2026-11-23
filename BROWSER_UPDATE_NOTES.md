# TAPAS OS Browser and App Store Update

## Changes
- Reserved additional desktop space above the persistent Dock so maximized app windows do not extend underneath it.
- Changed Vercel/Web browser navigation to attempt in-app iframe display instead of opening a new Chrome/Safari tab.
- Added browser Back, Forward, Reload, Home, URL navigation, and recent-history behavior for the Web edition.
- Added an explicit notice for websites that block iframe embedding. Such sites cannot be forced into the Web edition by a hosted web app.
- Routed App Store web-app launches into the TAPAS Browser in both Web and Tauri editions. The Web edition attempts iframe display; the Tauri edition uses its native Tauri WebView.
- Added Discord, Slack, Trello, WhatsApp Web, Telegram Web, Reddit, Netflix, and Microsoft 365 to the App Store catalogue as website shortcuts.

## Important limitations
- Many services (including Google, YouTube, social networks, and streaming services) may prevent iframe embedding through their security headers or authentication policies. The Web edition cannot bypass those browser protections and will not silently open an external browser.
- The Tauri desktop edition uses a native WebView, but individual services may still restrict sign-in, playback, DRM, popups, or embedded use.
- The existing desktop ad-filter script is basic client-side filtering, not a network-level ad blocker. It cannot guarantee ad-free YouTube or Google. The Web edition cannot inspect or filter cross-origin iframe content.
- App Store web entries are website shortcuts, not native installers. Installing them does not download native applications.

## Validation
The source was updated, but a production build could not be completed in this environment because the ZIP's included `node_modules` type packages were incomplete and `npm ci` did not finish. Run the following locally after extracting/merging the project:

```bash
npm ci
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
npm run tauri dev
```

No changes were made to the existing My Files, Settings, Sicily AI, TAPAS AI, Control Center, built-in apps, or Dock behavior beyond the shared desktop-window boundary reserved above the Dock.
