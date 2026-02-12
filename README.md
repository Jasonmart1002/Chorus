<p align="center">
  <img src="Chorus Logo.png" alt="Chorus" width="520" />
</p>

<p align="center">
  <strong>A native desktop app for running multiple Claude Code agents in parallel.</strong>
</p>

<p align="center">
  <a href="#features">Features</a> &bull;
  <a href="#installation">Installation</a> &bull;
  <a href="#usage">Usage</a> &bull;
  <a href="#development">Development</a> &bull;
  <a href="#architecture">Architecture</a>
</p>

<p align="center">
  <a href="https://github.com/Jasonmart1002/Chorus/releases"><img alt="Latest Release" src="https://img.shields.io/github/v/release/Jasonmart1002/Chorus?style=flat-square&color=7c3aed" /></a>
  <a href="https://github.com/Jasonmart1002/Chorus/blob/main/LICENSE"><img alt="License" src="https://img.shields.io/github/license/Jasonmart1002/Chorus?style=flat-square&color=7c3aed" /></a>
  <a href="https://github.com/Jasonmart1002/Chorus/stargazers"><img alt="Stars" src="https://img.shields.io/github/stars/Jasonmart1002/Chorus?style=flat-square&color=7c3aed" /></a>
  <img alt="Platform" src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-7c3aed?style=flat-square" />
</p>

---

## The Problem

You're using Claude Code across multiple projects. Each one needs its own terminal. You're alt-tabbing between 5+ windows, losing track of which agent finished, which one errored, and which one is waiting for input.

## The Solution

Chorus puts every agent in **one window**. Create agents, assign them to project directories, fire off prompts, and let them work in parallel. When an agent finishes or needs your attention, you'll know immediately — no terminal archaeology required.

---

<p align="center">
  <img src="screenshots/dark-overview.png" alt="Chorus — Dark Mode" width="800" />
</p>

<p align="center">
  <img src="screenshots/light-overview.png" alt="Chorus — Light Mode" width="800" />
</p>

<details>
<summary><strong>More screenshots</strong></summary>

| Git Quick Actions | Run Commands | New Agent |
|:-:|:-:|:-:|
| ![Git menu](screenshots/git-menu-dark.png) | ![Run dialog](screenshots/run-command-dark.png) | ![New agent](screenshots/new-agent-dark.png) |

| Diff Viewer | Light Theme |
|:-:|:-:|
| ![Diff viewer](screenshots/diff-viewer.png) | ![Light new agent](screenshots/new-agent-light.png) |

</details>

---

## Features

### Multi-Agent Management
Create as many agents as you need. Each gets its own Claude Code process, scoped to a specific project directory, with an independent conversation and session history.

### Real-Time Streaming
Every agent streams its output live — text responses, tool calls, results — rendered with full **Markdown** and **syntax highlighting**. No polling, no refresh.

### Git Quick Actions
Built-in shortcuts for the most common Git workflows: **view diffs** (unstaged, staged, or vs. main), **commit**, **create PRs**, **push**, and **stash** — all without leaving the app.

### Run Shell Commands
Execute arbitrary commands in any agent's working directory with live stdout/stderr streaming. Includes presets for npm, yarn, pnpm, and bun.

### Terminal Handoff
Need to go deeper? Open a native terminal at any agent's directory, or launch an interactive `claude --resume` session that picks up exactly where the agent left off.

### Agent Organization
**Pin** important agents to the top. **Archive** ones you're done with. **Rename** them. **Drag-and-drop** to reorder. **Filter** by status — active, needs attention, or show all. **Search** by name or path.

### Notifications
In-app banners and **OS-native notifications** when any agent completes or errors. Never miss a result.

### Light & Dark Themes
Beautiful **Catppuccin**-inspired palettes with warm pastels, soft gradients, and a playful chunky design. Persists across sessions.

### Keyboard-First
`Cmd+N` to create, `Cmd+1`–`9` to switch agents, `Cmd+Enter` to send, `Shift+Tab` to toggle plan mode. Everything important has a shortcut.

---

## Installation

### Prerequisites

- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) installed and authenticated
- [Node.js](https://nodejs.org/) 18+
- [Rust](https://rustup.rs/) toolchain

### From Source

```bash
git clone https://github.com/Jasonmart1002/Chorus.git
cd Chorus
npm install
npm run tauri build
```

The built app will be in `src-tauri/target/release/bundle/`.

### Download

Grab the latest `.dmg` from the [Releases page](https://github.com/Jasonmart1002/Chorus/releases/latest).

---

## Usage

### Create an Agent

1. Click **+ New Agent** or press `Cmd+N`
2. Enter a name and select a working directory
3. Optionally choose a model and permission mode
4. The agent spawns immediately and is ready for prompts

### Work in Parallel

Send a prompt to one agent, switch to another with `Cmd+2`, send a different prompt. Both run simultaneously. The sidebar shows live status for every agent — green for working, yellow for waiting, red for errors.

### Plan Mode

Toggle with `Shift+Tab` before sending. The agent will draft an implementation plan for your approval before writing any code.

### Stop & Resume

Hit **Stop** to interrupt an agent mid-task. Chorus transparently restarts the process with the same session — the conversation history is preserved and the agent picks up right where it was.

---

## Development

```bash
npm install
npm run tauri dev
```

This starts Vite with HMR on `localhost:1420` and launches the Tauri window. Frontend changes hot-reload instantly; Rust changes trigger a recompile.

### Project Structure

```
src/                    # React frontend
  components/           # UI components
  store/                # Zustand stores (agent, sidebar, theme, toast)
  types/                # TypeScript type definitions
  lib/                  # Theme, constants, utilities
src-tauri/              # Rust backend
  src/agent/            # Process spawning, state management
  src/commands.rs       # Tauri IPC command handlers
  src/tray/             # System tray integration
```

---

## Architecture

```
┌──────────────────────────────────────────────┐
│              React + Zustand UI              │
│         (streaming messages, controls)        │
└────────────────────┬─────────────────────────┘
                     │ Tauri IPC (invoke / listen)
┌────────────────────┴─────────────────────────┐
│              Rust Backend (Tauri)             │
│     Agent lifecycle, PID registry, events     │
└──┬──────────┬──────────┬─────────────────────┘
   │          │          │  NDJSON stdin/stdout
┌──┴──┐  ┌───┴──┐  ┌───┴──┐
│claude│  │claude│  │claude│  ... one process per agent
└─────┘  └──────┘  └──────┘
```

Each agent runs as a `claude -p --output-format stream-json` process. The Rust backend parses the NDJSON stream, infers agent status from message types, and emits events to the frontend in real time. A global PID registry ensures all child processes are cleaned up on exit.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite, Zustand |
| Desktop | Tauri v2 (Rust) |
| Styling | Catppuccin palettes, CSS-in-JS |
| AI Backend | Claude Code CLI (stream-json mode) |
| Fonts | Space Mono, Inter, JetBrains Mono |

---

## Contributing

Contributions are welcome! Feel free to open issues for bugs or feature requests, or submit a pull request.

---

## License

[MIT](LICENSE)

---

<p align="center">
  <sub>Built with Tauri, React, and way too many Claude Code agents running at once.</sub>
</p>
