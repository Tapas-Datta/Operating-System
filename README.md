# TAPAS OS — Groq-Powered AI Desktop Agent

<p align="center">
  <strong>A permission-based AI assistant integrated into the TAPAS OS desktop environment.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Platform-Tauri%20Desktop-blue" />
  <img src="https://img.shields.io/badge/AI-Groq-orange" />
  <img src="https://img.shields.io/badge/Backend-Rust-orange" />
  <img src="https://img.shields.io/badge/Frontend-TypeScript-blue" />
  <img src="https://img.shields.io/badge/Security-Permission--Based-success" />
</p>

---

## Overview

TAPAS OS AI Agent brings AI-powered assistance directly into the TAPAS OS desktop environment using Groq.

It is designed to help users interact with their workspace through natural language while maintaining explicit user control over sensitive operations.

Unlike unrestricted computer-control agents, TAPAS AI follows a permission-based approach. File creation requires user confirmation, filesystem operations are restricted to the Home directory, and application access is controlled through an allowlist.

This implementation replaces the existing AI app placeholder and registers a dedicated Rust command without modifying the existing Sicily AI route or implementation.

## Features

- **Groq-Powered AI:** Natural-language interaction using Groq models.
- **Workspace Navigation:** List directories within the user's Home directory.
- **Folder Creation:** Create folders after explicit user confirmation.
- **File Creation:** Create empty files after explicit user confirmation.
- **Application Access:** Open existing TAPAS applications through an allowlist.
- **Filesystem Restrictions:** Reject absolute paths and directory traversal attempts.
- **Secure API Key Handling:** Keep the Groq API key in the Rust process environment rather than embedding it in frontend source code.
- **Existing Integration:** Preserve the existing Sicily AI implementation.

## Architecture

The agent uses a frontend-to-backend architecture:

| Component | Responsibility |
|---|---|
| React / TypeScript | User interface and interaction |
| Rust / Tauri | Native command execution |
| Groq API | AI-powered responses |
| Tauri Commands | Controlled workspace operations |

The frontend communicates with the Rust backend through registered Tauri commands. The backend handles permitted operations and enforces filesystem restrictions.

## Requirements

Before installation, make sure you have:

- macOS, Windows, or Linux with a supported Tauri development environment
- Node.js and npm
- Python 3
- Rust toolchain and Cargo
- Tauri system dependencies for your operating system
- A Groq API key

Useful resources:

- [Node.js](https://nodejs.org/)
- [Python](https://www.python.org/)
- [Rust](https://www.rust-lang.org/tools/install)
- [Tauri Documentation](https://v2.tauri.app/)
- [Groq Console](https://console.groq.com/keys)

## Installation

### 1. Extract the Patch

Extract the ZIP archive into the existing TAPAS OS project root:

```bash
~/TAPAS_OS/tapas-desktop
```

Merge the folders with the existing project files.

**Important:** Back up your project before applying the patch.

### 2. Run the Installer

Open Terminal and navigate to the project directory:

```bash
cd ~/TAPAS_OS/tapas-desktop
```

Run the installer:

```bash
python3 install_tapas_agent.py
```

The installer applies the AI Agent integration to the existing project.

### 3. Configure Your Groq API Key

Create an API key from:

[Groq Console — API Keys](https://console.groq.com/keys)

Set the key in your current Terminal session:

```bash
export GROQ_API_KEY="YOUR_GROQ_API_KEY"
```

Replace `YOUR_GROQ_API_KEY` with your actual key.

**Security Notice:** Never commit your API key, expose it in frontend source code, or include it in screenshots.

### 4. Build and Verify

Build the frontend:

```bash
npm run build
```

Check the Rust backend:

```bash
cargo check --manifest-path src-tauri/Cargo.toml
```

Launch TAPAS OS:

```bash
npm run tauri dev
```

Keep the Terminal session containing `GROQ_API_KEY` active while running the application.

## Supported Actions

The initial implementation supports four controlled action types:

| Action | Description | Permission |
|---|---|---|
| `list_directory` | List directories within Home | Restricted to Home |
| `create_folder` | Create a new folder | User confirmation |
| `create_file` | Create an empty file | User confirmation |
| `open_folder` | Open an existing TAPAS application | Allowlisted applications |

## Security and Permissions

Security is a core design principle of TAPAS AI.

The agent is intentionally restricted to a limited set of operations.

### Security Measures

- Filesystem access is restricted to the user's Home directory.
- Absolute paths are rejected.
- `.` and `..` path traversal attempts are rejected.
- Folder and file creation require explicit user confirmation.
- Application access uses an allowlist.
- The Groq API key is provided through the Rust process environment.
- The frontend does not contain an embedded API key.

### Current Limitations

TAPAS AI is a permission-based first-generation agent, not an unrestricted computer-control system.

It cannot:

- Execute shell commands.
- Delete files or folders.
- Read file contents.
- Access passwords or private credentials.
- Download or install software.
- Make payments or financial transactions.
- Perform unrestricted filesystem operations.

These restrictions are intentional.

## App Store Compatibility

This patch does not introduce an application installer or an unsupported package-management system.

The source archive does not include a signed application catalogue, package format, application manifests, or trusted repository URLs.

A production-ready App Store installation system requires:

- A trusted application catalogue.
- Signed application packages.
- Package checksum verification.
- A defined installation and uninstallation lifecycle.

TAPAS OS should only present installation functionality when these requirements are implemented.

## Sicily AI Compatibility

The existing Sicily AI route and implementation are intentionally left untouched by this patch.

The integration focuses exclusively on replacing the existing AI application placeholder and registering the required Rust command.

## Troubleshooting

### Groq API Key Not Found

If the application cannot access the Groq API:

```bash
echo ${GROQ_API_KEY:+GROQ_API_KEY is configured}
```

If no confirmation appears, configure the key again:

```bash
export GROQ_API_KEY="YOUR_GROQ_API_KEY"
```

### Frontend Build Failure

Run:

```bash
npm install
npm run build
```

Check the terminal output for TypeScript or dependency errors.

### Rust Compilation Failure

Run:

```bash
cargo check --manifest-path src-tauri/Cargo.toml
```

Verify that the Rust toolchain and required Tauri dependencies are installed.

### Agent Does Not Start

Verify that:

- The Groq API key is configured.
- The application was launched from the same Terminal session.
- The Rust command was registered successfully.
- The required dependencies are installed.

Groq API availability and free-tier rate limits may affect requests.

## Project Philosophy

TAPAS OS aims to combine a modern desktop experience with practical AI capabilities.

The AI Agent follows three principles:

1. **User Control:** Sensitive actions require explicit approval.
2. **Security First:** Access is restricted rather than unrestricted.
3. **Transparency:** Capabilities and limitations are clearly documented.

The goal is not to give AI unlimited control over a computer, but to make AI useful while keeping the user in control.

## Future Development

Potential future improvements include:

- More controlled workspace operations.
- Improved application discovery.
- A verified application catalogue.
- Signed application package installation.
- Better permission management.
- Expanded AI interaction capabilities.

These are development goals, not claims about currently implemented functionality.

## License

Add the project's actual license information here once its licensing terms have been decided.

---

<p align="center">
  <strong>Built as part of TAPAS OS</strong><br/>
  <sub>AI assistance with security, transparency, and user control.</sub>
</p>
