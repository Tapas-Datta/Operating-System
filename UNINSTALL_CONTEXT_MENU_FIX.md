# TAPAS OS — Desktop app context menu fix

## What changed
- Replaced the previous immediate browser-confirm right-click handler with a TAPAS OS-owned context menu.
- The context menu is opened from the desktop app icon's `contextmenu` event and calls `preventDefault()` and `stopPropagation()`.
- Menu actions: Open, and Uninstall for user-installed Store apps.
- Built-in apps are explicitly marked as protected.
- Uninstall asks for confirmation and then uses the existing `uninstallApp` state update, which removes the app from installed state, desktop order, and open windows.
- Clicking outside the menu dismisses it.

## Verification
This source patch was created against the uploaded project ZIP. A full build/runtime test has not been run because dependencies are not installed in this environment. Run `npm ci && npm run build` on the development Mac, then test right-click/Control-click on a user-installed desktop app.
