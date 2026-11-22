# TAPAS OS — Groq TAPAS AI Agent (overlay patch)

This adds a Groq-powered TAPAS AI desktop agent. The patcher replaces only the existing `AI` app placeholder and registers one Rust command. It does **not** alter the Sicily AI route or its implementation.

## Install

1. Extract this ZIP into the project root: `~/TAPAS_OS/tapas-desktop` (merge folders).
2. From Terminal:

```bash
cd ~/TAPAS_OS/tapas-desktop
python3 install_tapas_agent.py
```

3. Create a Groq API key at https://console.groq.com/keys, then set it in the same Terminal session:

```bash
export GROQ_API_KEY="YOUR_GROQ_API_KEY"
```

4. Build and run:

```bash
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
npm run tauri dev
```

The API key stays in the Rust process environment; it is not embedded in frontend source. Do not commit it or include it in screenshots.

## Supported actions

- List directories within Home using the existing `list_directory` Tauri command.
- Create folders and empty files within Home, after a confirmation dialog.
- Open existing TAPAS apps from an allowlist.
- Reject absolute paths and `.` / `..` traversal.

This is a permission-based first agent, not unrestricted computer control. It cannot run shell commands, delete files, read file contents, download/install software, access passwords, or make payments. Groq free-tier rate limits apply.

## App Store note

This source archive did not include a signed TAPAS app catalogue, package format, app manifests, or trusted repository URLs. Therefore this patch does not add fake Install/Download buttons. A real App Store installer needs a trusted catalogue, signed packages/checksums, and an install/uninstall lifecycle. Sicily AI remains untouched.
