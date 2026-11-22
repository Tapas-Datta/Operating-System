# TAPAS OS Web + Desktop implementation notes

## Implemented in this source snapshot

- Added a platform adapter that routes Tauri commands to the native backend in Desktop and browser-compatible IndexedDB operations in Web.
- Kept native Tauri browser operations inside the Desktop-only browser component.
- Added a Web Browser launcher that opens external sites in normal browser tabs (sites commonly block iframe embedding).
- Added a Vercel serverless TAPAS AI endpoint. It reads `GROQ_API_KEY` server-side and validates the action allowlist and workspace-relative paths.
- Updated TAPAS AI to use the platform adapter and request user approval before file creation.
- Improved IndexedDB workspace operations, subtree move/copy/rename, and grouped Recycle Bin restore/delete.
- Added default workspace folders, file import/export, Web settings fallbacks, TAPAS branding, Vercel deployment configuration, and GitHub Actions workflows.
- Added `WEB_DEPLOYMENT.md` with deployment and limitation notes.

## Important validation status

TypeScript/TSX syntax transpilation passed for all 24 source/API TypeScript files. JSON validation passed for `package.json`, `src-tauri/tauri.conf.json`, and `vercel.json`.

A full `npm run build` could not be completed in this environment because dependencies were not available. `npm ci` timed out and offline installation reported that the Vite package tarball was not cached. Run `npm ci` and `npm run build` on the development Mac or in GitHub Actions before deploying.

## Required Vercel configuration

Set `GROQ_API_KEY` in Vercel Project Settings → Environment Variables. Optionally set `GROQ_MODEL` (defaults to `openai/gpt-oss-20b`). Never expose the key in a `VITE_` variable.

## Release workflow

Push a tag such as `v0.1.0` to trigger `.github/workflows/desktop-release.yml`. Review the draft release artifacts before publishing. Code signing/notarization is not configured in this snapshot.
