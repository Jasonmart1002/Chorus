# CC-Manager Technical Documentation

**Version:** 0.1.0
**Identifier:** `com.ccmanager.app`

CC-Manager is a desktop application for managing multiple Claude Code AI agents from a single unified interface. Instead of running separate Claude Code CLI sessions in different terminal windows, CC-Manager lets you create, monitor, control, and interact with many agents simultaneously -- each scoped to its own project directory.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Backend (Rust / Tauri)](#backend-rust--tauri)
   - [Agent Lifecycle](#agent-lifecycle)
   - [IPC Commands](#ipc-commands)
   - [Event System](#event-system)
   - [Process Management](#process-management)
5. [Frontend (React / TypeScript)](#frontend-react--typescript)
   - [State Management](#state-management)
   - [Component Tree](#component-tree)
   - [Theming](#theming)
   - [Audio Feedback](#audio-feedback)
6. [Data Models](#data-models)
7. [Features](#features)
   - [Agent Management](#agent-management)
   - [Conversation Streaming](#conversation-streaming)
   - [Command Execution](#command-execution)
   - [Git Quick Actions](#git-quick-actions)
   - [Terminal Integration](#terminal-integration)
   - [Notifications](#notifications)
   - [Sidebar Organization](#sidebar-organization)
8. [Keyboard Shortcuts](#keyboard-shortcuts)
9. [Configuration](#configuration)
10. [Building and Running](#building-and-running)

---

## Architecture Overview

CC-Manager follows a two-process architecture provided by Tauri 2:

```
┌──────────────────────────────────────────────────────────┐
│  Frontend (WebView)                                      │
│  React 19 + TypeScript + Zustand                         │
│                                                          │
│  ┌──────────┐  ┌───────────────┐  ┌──────────────────┐  │
│  │ Sidebar  │  │  Main Panel   │  │  Dialogs/Modals  │  │
│  │ Filters  │  │  Agent View   │  │  NewAgent / Run  │  │
│  │ Cards    │  │  Messages     │  │                  │  │
│  │          │  │  Prompt Input │  │                  │  │
│  └──────────┘  └───────────────┘  └──────────────────┘  │
│                        │                                 │
│                   invoke() / listen()                    │
└────────────────────────┼─────────────────────────────────┘
                         │  Tauri IPC Bridge
┌────────────────────────┼─────────────────────────────────┐
│  Backend (Rust)        │                                 │
│                        ▼                                 │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  Agent Manager (in-memory HashMap)                  │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐            │ │
│  │  │ Agent 1  │ │ Agent 2  │ │ Agent N  │  ...       │ │
│  │  │ process  │ │ process  │ │ process  │            │ │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘            │ │
│  └───────┼─────────────┼───────────┼───────────────────┘ │
│          │             │           │                     │
│          ▼             ▼           ▼                     │
│     claude CLI    claude CLI  claude CLI                 │
│     (stream-json) (stream-json) (stream-json)           │
└──────────────────────────────────────────────────────────┘
```

The frontend communicates with the backend through Tauri's IPC mechanism: `invoke()` for request-response commands, and `listen()` for event streams. Each agent is backed by a spawned `claude` CLI process running in streaming JSON mode.

---

## Technology Stack

| Layer     | Technology                                    |
|-----------|-----------------------------------------------|
| Frontend  | React 19, TypeScript 5.7, Vite 6              |
| State     | Zustand 5 (with `persist` middleware)          |
| Icons     | Lucide React                                  |
| Desktop   | Tauri 2.2 (Rust)                              |
| Async     | Tokio 1 (full features)                       |
| Serialize | Serde, serde_json                             |
| Process   | tokio::process, libc (POSIX signals)          |
| IDs       | uuid v4                                       |
| Time      | chrono                                        |
| Binary    | which (claude CLI resolution)                 |
| Plugins   | tauri-plugin-notification, tauri-plugin-dialog |
| Fonts     | Inter, Space Mono, JetBrains Mono              |

---

## Project Structure

```
CC-Manager/
├── src/                              # Frontend source
│   ├── main.tsx                      # React entry point
│   ├── App.tsx                       # Root component (initializes store)
│   ├── index.css                     # Global styles
│   ├── components/
│   │   ├── Layout.tsx                # Top-level layout wrapper
│   │   ├── Sidebar/
│   │   │   ├── Sidebar.tsx           # Agent list with drag-and-drop
│   │   │   ├── AgentCard.tsx         # Individual agent row
│   │   │   ├── SidebarFilters.tsx    # Search bar + status filter
│   │   │   └── NewAgentButton.tsx    # "+ New Agent" trigger
│   │   ├── MainPanel/
│   │   │   ├── MainPanel.tsx         # Right-side content router
│   │   │   ├── AgentView.tsx         # Full agent workspace
│   │   │   ├── MessageStream.tsx     # Scrollable conversation thread
│   │   │   └── ContextSummary.tsx    # Agent header bar with actions
│   │   ├── PromptInput/
│   │   │   └── PromptInput.tsx       # Message composer
│   │   ├── Queue/
│   │   │   └── NotificationBanner.tsx # Attention banner
│   │   ├── NewAgentDialog.tsx        # Create agent modal
│   │   └── RunDialog.tsx             # Shell command runner modal
│   ├── store/
│   │   ├── agentStore.ts             # Core state + IPC bridge
│   │   ├── sidebarStore.ts           # Sidebar preferences (persisted)
│   │   └── themeStore.ts             # Light/dark theme (persisted)
│   ├── types/
│   │   ├── agent.ts                  # Agent, AgentConfig, AgentStatus
│   │   └── messages.ts               # SDK message types + event payloads
│   ├── lib/
│   │   ├── theme.ts                  # Light/dark color definitions
│   │   ├── constants.ts              # Status colors and labels
│   │   ├── sounds.ts                 # Procedural audio feedback
│   │   └── sortAgents.ts             # Agent list sorting logic
│   └── hooks/
│       └── useNotifications.ts       # OS notification hook
│
├── src-tauri/                        # Backend source
│   ├── src/
│   │   ├── main.rs                   # Binary entry point
│   │   ├── lib.rs                    # Tauri app builder + plugin setup
│   │   ├── commands.rs               # All IPC command handlers
│   │   ├── agent/
│   │   │   ├── mod.rs                # Module exports
│   │   │   ├── manager.rs            # Agent registry (HashMap)
│   │   │   ├── state.rs              # AgentState, AgentConfig, AgentStatus
│   │   │   └── process.rs            # Claude CLI spawn + I/O streaming
│   │   └── tray/
│   │       ├── mod.rs                # System tray setup
│   │       └── badge.rs              # Tray icon badge
│   ├── Cargo.toml                    # Rust dependencies
│   ├── build.rs                      # Tauri build script
│   └── tauri.conf.json               # Window, bundle, security config
│
├── index.html                        # HTML shell
├── vite.config.ts                    # Vite dev server config
├── tsconfig.json                     # TypeScript compiler options
└── package.json                      # npm scripts + JS dependencies
```

---

## Backend (Rust / Tauri)

### Agent Lifecycle

Each agent goes through the following states:

```
create_agent()
     │
     ▼
  ┌──────┐   system.init received   ┌────────────────┐
  │ Idle │ ───────────────────────▶ │ Awaiting Input │◀──────────┐
  └──────┘                          └───────┬────────┘           │
                                            │                    │
                                   send_prompt()           result.success
                                            │                    │
                                            ▼                    │
                                      ┌─────────┐               │
                                      │ Working │───────────────┘
                                      └────┬────┘
                                           │
                                    result.error_*
                                           │
                                           ▼
                                      ┌─────────┐
                                      │ Errored │
                                      └─────────┘

  stop_agent() / kill_agent() ──▶  ┌────────┐
                                   │ Exited │
                                   └────────┘
```

**Status definitions:**

| Status           | Meaning                                              |
|------------------|------------------------------------------------------|
| `idle`           | Agent just created, CLI process starting up           |
| `working`        | Agent is actively generating a response               |
| `awaiting_input` | Agent finished a turn and is waiting for a new prompt |
| `errored`        | The last turn ended with an error                     |
| `exited`         | The CLI process has terminated                        |

### IPC Commands

These are the Tauri commands the frontend calls via `invoke()`:

#### `create_agent`

Creates a new agent, spawns a `claude` CLI process, and returns identifiers.

| Parameter         | Type              | Required | Default              |
|-------------------|-------------------|----------|----------------------|
| `name`            | `String`          | Yes      | -                    |
| `cwd`             | `String`          | Yes      | -                    |
| `model`           | `Option<String>`  | No       | CLI default          |
| `permission_mode` | `Option<String>`  | No       | `bypassPermissions`  |

**Returns:** `{ agent_id: String, session_id: String }`

The spawned CLI process runs with these flags:
```
claude -p --output-format stream-json --input-format stream-json \
  --verbose --session-id <uuid> --permission-mode <mode>
```

When `permission_mode` is `bypassPermissions`, the `AskUserQuestion` tool is also disabled via `--disallowed-tools`.

#### `send_prompt`

Sends a user message to an agent's stdin as stream-json.

| Parameter  | Type     | Required |
|------------|----------|----------|
| `agent_id` | `String` | Yes      |
| `text`     | `String` | Yes      |

The message is formatted as:
```json
{
  "type": "user",
  "message": {
    "role": "user",
    "content": [{"type": "text", "text": "<user input>"}]
  }
}
```

#### `stop_agent`

Gracefully stops an agent and respawns it with the same session ID. This is a transparent restart -- the conversation continues seamlessly because Claude reloads session history on startup.

Steps:
1. Suppress the exit event from the dying process
2. Send `SIGTERM` to allow graceful shutdown
3. Wait up to 3 seconds for exit
4. `SIGKILL` if still alive after timeout
5. Spawn a new process with the same `session_id`

#### `kill_agent`

Hard-kills an agent process (`SIGKILL`) and marks it as `exited`. No respawn.

#### `remove_agent`

Kills the agent process (if running) and removes all state for that agent from the manager.

#### `list_agents`

Returns all agents currently tracked by the manager as a `Vec<AgentState>`.

#### `run_command`

Runs an arbitrary shell command in a specified working directory.

| Parameter  | Type                            | Required |
|------------|---------------------------------|----------|
| `cwd`      | `String`                        | Yes      |
| `command`  | `String`                        | Yes      |
| `env_vars` | `Option<HashMap<String,String>>`| No       |

The command is executed via `sh -c` in its own process group. Stdout and stderr are streamed line-by-line to the frontend via events.

#### `kill_running_command`

Terminates a running command by CWD. Sends `SIGTERM` to the process group; falls back to `SIGKILL` on the individual PID if that fails.

#### `open_terminal`

Opens macOS Terminal.app at the specified directory using AppleScript.

#### `open_claude_terminal`

Opens macOS Terminal.app and runs `claude --resume <session_id>` in the specified directory, allowing the user to take over an agent session in a native terminal.

### Event System

The backend emits events to the frontend via Tauri's event system:

| Event                   | Payload                                      | Trigger                                        |
|-------------------------|----------------------------------------------|------------------------------------------------|
| `agent-message`         | `{ agent_id, message }` (raw JSON)           | Every NDJSON line from claude stdout            |
| `agent-status-changed`  | `{ agent_id, status }`                       | Status inferred from message type               |
| `agent-entered-queue`   | `{ agent_id, agent_name, reason }`           | Agent completed or errored (needs attention)    |
| `command-output`        | `{ cwd, line, stream }`                      | Each stdout/stderr line from a running command  |
| `command-done`          | `{ cwd, exit_code }`                         | Command process exited                          |
| `agent-stderr`          | `{ agent_id, line }`                         | Each stderr line from a claude process          |

**Status inference logic** (from stdout messages):

| Message type   | Subtype      | Resulting status   |
|----------------|-------------|--------------------|
| `system`       | `init`      | `awaiting_input`   |
| `assistant`    | -           | `working`          |
| `result`       | `success`   | `awaiting_input`   |
| `result`       | `error_*`   | `errored`          |

### Process Management

**PID Registry:** A global `Vec<u32>` tracks all spawned claude processes. On app shutdown, `kill_all_children()` sends `SIGKILL` to every registered PID, ensuring no orphaned processes.

**Claude binary resolution:** Since macOS app bundles do not inherit the user's shell `PATH`, the backend searches for the `claude` binary in order:
1. System `PATH` (via the `which` crate)
2. `~/.local/bin/claude`
3. `~/.claude/bin/claude`
4. `/usr/local/bin/claude`
5. `/opt/homebrew/bin/claude`

---

## Frontend (React / TypeScript)

### State Management

The frontend uses three Zustand stores:

#### `agentStore` (core application state)

Holds all runtime data. Not persisted -- rebuilt on app launch.

| Field             | Type                              | Purpose                              |
|-------------------|-----------------------------------|--------------------------------------|
| `agents`          | `Record<string, Agent>`           | All known agents by ID               |
| `messages`        | `Record<string, SDKMessage[]>`    | Message history per agent            |
| `attentionSet`    | `Record<string, boolean>`         | Agents flagged as needing attention  |
| `selectedAgentId` | `string \| null`                  | Currently viewed agent               |
| `commandStates`   | `Record<string, CommandState>`    | Running/completed command output     |
| `savedCommands`   | `Record<string, string>`          | Last command used per CWD            |

The store's `init()` method registers all Tauri event listeners and fetches the initial agent list from the backend.

#### `sidebarStore` (persisted to localStorage as `cc-sidebar-prefs`)

| Field          | Type                              | Purpose                         |
|----------------|-----------------------------------|---------------------------------|
| `agentPrefs`   | `Record<string, AgentPrefs>`      | Pin, archive, displayName       |
| `searchQuery`  | `string`                          | Filter agents by name/directory |
| `statusFilter` | `"all" \| "active" \| "attention"`| Filter by agent status          |
| `showArchived` | `boolean`                         | Toggle archived agent visibility|
| `manualOrder`  | `string[]`                        | Custom agent sort order         |

#### `themeStore` (persisted to localStorage as `cc-theme`)

| Field    | Type           | Purpose                    |
|----------|----------------|----------------------------|
| `mode`   | `"light" \| "dark"` | Current theme mode    |
| `current`| `ThemeColors`  | Active color palette       |

### Component Tree

```
App
└── Layout
    ├── Sidebar
    │   ├── Header (app name, theme toggle)
    │   ├── SidebarFilters (search input, status filter chips)
    │   ├── AgentCard[] (draggable agent list items)
    │   │   └── Status dot, name, directory, cost, context menu
    │   └── NewAgentButton
    ├── MainPanel
    │   └── AgentView (when agent selected)
    │       ├── ContextSummary
    │       │   └── Name, status, CWD, turns, model, action buttons
    │       ├── MessageStream
    │       │   └── Rendered message blocks (system, assistant, tool, result, user)
    │       └── PromptInput
    │           └── Textarea, mode toggle (normal/plan), send button
    ├── NotificationBanner (when agents need attention)
    ├── NewAgentDialog (modal)
    │   └── Name, directory (with folder picker), model, permission mode
    └── RunDialog (modal)
        └── Command input, preset buttons, env vars, streaming output
```

### Theming

Two complete color palettes are defined in `src/lib/theme.ts`:

**Light theme** -- Warm beige/tan backgrounds with lavender/purple accents:
- Base: `#EDE4D8`, Sidebar: `#DDD0E8`, Surface: `#F5EDE2`
- Primary text: `#1E1A22`, Accent: `#8B6BAA`

**Dark theme** -- Deep purple/plum backgrounds:
- Base: `#1A1625`, Sidebar: `#211C2E`, Surface: `#242030`
- Primary text: `#EDE8F2`, Accent: `#B898D4`

Both themes use three font families:
- **Headings:** Space Mono (monospace)
- **Body:** Inter (sans-serif)
- **Code:** JetBrains Mono (monospace)

The theme is toggled via a button in the sidebar header and persists across sessions.

### Audio Feedback

All sounds are procedurally generated using the Web Audio API (no audio files). Defined in `src/lib/sounds.ts`:

| Sound          | Description                    | Notes/Frequencies          |
|----------------|--------------------------------|----------------------------|
| Click          | Soft pop                       | 330 Hz sine, 80ms          |
| Open           | Ascending chime                | C5 -> E5 -> G5 triangle    |
| Close          | Descending chime               | G5 -> E5 -> C5 triangle    |
| Toggle         | Tick + sparkle                 | 800 Hz + 1200 Hz sine      |
| Success        | Ascending arpeggio             | C5 -> E5 -> G5 -> C6       |
| Error          | Gentle descent                 | E4 -> C4 sine              |
| Notification   | Warming chime                  | A5 -> ~C#6 triangle        |

---

## Data Models

### Agent (frontend)

```typescript
interface Agent {
  id: string;                    // UUID v4
  config: AgentConfig;
  status: AgentStatus;           // "idle" | "working" | "awaiting_input" | "errored" | "exited"
  session_id: string;            // UUID v4, used for claude --session-id
  created_at: string;            // ISO 8601 timestamp
  cost_usd: number;              // Cumulative cost from result messages
  num_turns: number;             // Cumulative turn count
}

interface AgentConfig {
  name: string;                  // Display name
  cwd: string;                   // Working directory
  model?: string;                // Model override (e.g. "claude-sonnet-4-20250514")
  permission_mode: string;       // "bypassPermissions" or "default"
}
```

### AgentState (backend)

```rust
pub struct AgentState {
    pub id: String,
    pub config: AgentConfig,
    pub status: AgentStatus,     // Idle, Working, AwaitingInput, Errored, Exited
    pub session_id: String,
    pub created_at: String,
    pub cost_usd: f64,
    pub num_turns: u32,
}
```

### SDK Messages

Messages streamed from the claude CLI follow the Claude Code SDK format:

```typescript
// Initialization (tools list, session start)
interface SystemInitMessage {
  type: "system";
  subtype: "init";
  session_id: string;
  tools: string[];
}

// Claude's response (text + tool calls)
interface AssistantMessage {
  type: "assistant";
  message: {
    content: (TextBlock | ToolUseBlock | ToolResultBlock)[];
  };
}

// Turn result
interface ResultMessage {
  type: "result";
  subtype: "success" | "error_max_turns" | "error_tool_use";
  result: string;
  total_cost_usd?: number;
  num_turns?: number;
}
```

### Command State

```typescript
interface CommandState {
  cwd: string;                          // Working directory
  command: string;                      // Shell command string
  running: boolean;                     // Whether still executing
  lines: string[];                      // Streamed stdout/stderr output
  exitCode: number | null | undefined;  // undefined=running, null=signal, number=code
}
```

### Agent Preferences (persisted)

```typescript
interface AgentPrefs {
  pinned: boolean;                      // Sticky to top of sidebar
  archived: boolean;                    // Hidden from default view
  displayName: string | null;           // Custom label override
}
```

---

## Features

### Agent Management

**Creating agents:** The NewAgentDialog collects a name, working directory (with native folder picker), optional model override, and permission mode. On creation, the backend spawns a `claude` CLI process and the frontend auto-selects the new agent.

**Duplicating agents:** Any agent can be duplicated, which creates a new agent with the same directory, model, and permission settings but a fresh session.

**Stopping agents:** `stop_agent` performs a transparent kill-and-respawn. The old process receives `SIGTERM`, is given 3 seconds to exit gracefully, then `SIGKILL` if needed. A new process is spawned with the same `session_id`, so the conversation picks up where it left off.

**Killing agents:** `kill_agent` sends `SIGKILL` and marks the agent as exited. No respawn occurs.

**Removing agents:** Kills the process, removes the agent from the backend manager, clears frontend state and preferences.

### Conversation Streaming

Messages from each agent's claude process are streamed as NDJSON, parsed in the backend, and forwarded to the frontend via the `agent-message` event. The `MessageStream` component renders these in real time:

- **System init messages** are hidden from the display
- **Assistant messages** render text blocks and tool use blocks
- **Consecutive identical tool uses** are visually grouped
- **Tool results** are displayed inline
- **User prompts** show what was sent
- **Result messages** show completion or error states with cost/turn info

The message stream auto-scrolls to the latest message.

### Command Execution

The RunDialog allows running arbitrary shell commands in an agent's working directory:

- Command input with preset buttons for common package managers (`npm`, `yarn`, `pnpm`, `bun`)
- Optional environment variable configuration
- Real-time stdout/stderr streaming displayed in a terminal-style output area
- Process group management ensures child processes are cleaned up
- Running commands can be killed via the UI

Commands are keyed by CWD, meaning one command can run per unique directory at a time.

### Git Quick Actions

The ContextSummary header for each agent includes quick action buttons that send pre-formatted prompts to the agent:

- **Commit** -- asks the agent to commit current changes
- **Create PR** -- asks the agent to create a pull request
- **Push to main** -- asks the agent to push to the main branch
- **Stash** -- asks the agent to stash changes
- **Git status** -- asks the agent to show the repo status

These work by calling `sendPrompt()` with the appropriate instruction text.

### Terminal Integration

Two terminal actions are available per agent (macOS only, using AppleScript):

- **Open Terminal** -- opens Terminal.app with `cd` to the agent's working directory
- **Open Claude Terminal** -- opens Terminal.app and runs `claude --resume <session_id>`, letting you take over the session interactively

### Notifications

**In-app banner:** When any agent enters the attention set (completed a turn or errored), a `NotificationBanner` appears at the top of the window with the agent name and a "Go to agent" button.

**OS notifications:** The `useNotifications` hook requests permission and sends system notifications when agents need attention. Different messages are shown for errors vs. completed turns.

**Audio cues:** Procedurally generated sounds provide audio feedback for UI interactions (clicks, opens, closes, toggles) and agent events (success, error, notification chime).

### Sidebar Organization

The sidebar provides several tools for managing a large number of agents:

- **Search** -- filters agents by name or working directory path
- **Status filter** -- three modes: All, Active (non-exited), Attention (awaiting input or errored)
- **Pinning** -- pinned agents always appear at the top
- **Archiving** -- archived agents are hidden by default with a toggle to show them
- **Custom names** -- agents can be given display names independent of their config name
- **Drag-and-drop reordering** -- manual ordering is persisted across sessions
- **Keyboard selection** -- Cmd+1 through Cmd+9 selects agents by position

---

## Keyboard Shortcuts

| Shortcut                | Action                              |
|-------------------------|-------------------------------------|
| `Cmd+N`                 | Open new agent dialog               |
| `Cmd+1` through `Cmd+9` | Select agent by sidebar position   |
| `Cmd+Enter`             | Send prompt                         |
| `Ctrl+Enter`            | Send prompt (alternate)             |
| `Shift+Tab`             | Toggle prompt mode (normal / plan)  |
| `Escape`                | Close open dialog                   |

---

## Configuration

### Tauri Window

| Property       | Value  |
|----------------|--------|
| Default width  | 1200px |
| Default height | 800px  |
| Minimum width  | 900px  |
| Minimum height | 600px  |
| Decorations    | Native |
| Transparent    | No     |

### System Tray

The app runs a system tray icon with options to show/hide the window and quit.

### Build Optimizations (Release)

| Setting      | Value  |
|--------------|--------|
| Panic        | abort  |
| Codegen units| 1      |
| LTO          | true   |
| Opt level    | s (size) |
| Strip        | true   |

### Persistence

| Data              | Storage        | Key                  |
|-------------------|----------------|----------------------|
| Sidebar prefs     | localStorage   | `cc-sidebar-prefs`   |
| Theme preference  | localStorage   | `cc-theme`           |
| Agent state       | In-memory only | -                    |
| Message history   | In-memory only | -                    |

---

## Building and Running

### Prerequisites

- [Node.js](https://nodejs.org/) and npm
- [Rust](https://www.rust-lang.org/tools/install) toolchain
- [Tauri CLI](https://tauri.app/) (`npm install -g @tauri-apps/cli`)
- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) (`claude` binary in PATH)

### Development

```bash
npm install
npm run tauri dev
```

This starts the Vite dev server on port 1420 with HMR and launches the Tauri window pointing to it.

### Production Build

```bash
npm run tauri build
```

Runs the TypeScript compiler, Vite production build, compiles the Rust backend, and produces platform-specific installers:

- **macOS:** `.dmg`, `.app`
- **Windows:** `.msi`, `.exe`
- **Linux:** `.deb`, `.AppImage`
