# TAPAS OS App Store update

## Included
- Expanded App Store catalogue with 16 curated web apps plus Notes, Calculator, and Gallery.
- Search by app name, description, and category.
- Category filters and app details panel.
- Install adds a shortcut to the Desktop and Start Menu.
- Open launches web apps in TAPAS Browser on Desktop; the Web demo opens them in a new browser tab.
- Uninstall removes the app shortcut and closes an open app window where applicable.
- Dock is intentionally excluded from install/uninstall and optional-app loading; its existing app list/order remains independent.
- Built-in Notes, Calculator, and Gallery remain available with their existing components.

## Important behavior
Web apps are website shortcuts, not downloaded native software. The Web demo opens external websites in a normal browser tab due browser security restrictions. Desktop uses the existing TAPAS Browser component and its launch-request flow.

## Validation
The source changes were reviewed. A production build could not be completed in this environment because dependency installation (`npm ci`) timed out and the uploaded archive did not contain a complete `node_modules` directory. Run `npm ci` and `npm run build` locally before committing or deploying.
