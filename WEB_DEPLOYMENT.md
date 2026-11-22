# TAPAS OS Web deployment

## Local development

```bash
npm ci
npm run dev
```

The Web build uses Vite and stores the TAPAS Workspace in the current browser's IndexedDB. Files imported into this workspace are not automatically uploaded to a server and are not shared between different browsers or devices.

## Vercel

1. Import the `Operating-System` GitHub repository into Vercel.
2. Keep the build command as `npm run build` and output directory as `dist` (also defined in `vercel.json`).
3. In Vercel Project Settings → Environment Variables, add `GROQ_API_KEY` for Production, Preview, and Development as needed.
4. Optionally add `GROQ_MODEL`; the API defaults to `openai/gpt-oss-20b`.
5. Redeploy after adding environment variables.

The Groq key is read only by `api/tapas-ai.ts`; never add it to a `VITE_` variable or frontend source. The endpoint includes a best-effort per-instance request throttle; before a high-traffic public launch, add persistent rate limiting or Vercel Firewall protection.

## Web limitations

- My Files uses IndexedDB for the TAPAS Workspace. Data stays in that browser profile unless the user exports it.
- Import Files copies user-selected files into the workspace. Export downloads a workspace file.
- Web Browser opens sites in a new browser tab because many sites block iframe embedding. The installed Tauri app retains its native browser implementation.
- Native operating-system settings, shell access, and unrestricted computer filesystem access are not available to the Web demo.
- TAPAS AI Web actions are limited to listing the workspace and creating files/folders after user approval.

## Desktop releases

Push a version tag such as `v0.1.0` to trigger `.github/workflows/desktop-release.yml`. GitHub Actions builds on macOS, Windows, and Linux and creates a draft GitHub Release. Review the artifacts before publishing. Public macOS distribution may additionally require Apple code signing and notarization; Windows signing is also recommended.
