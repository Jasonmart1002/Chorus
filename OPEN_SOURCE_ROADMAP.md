# Cadenza — Open Source Readiness Roadmap

## Current State

Cadenza is a Tauri 2 + React 19 + Rust desktop app for managing multiple Claude Code
agent sessions. At ~2,500 lines of code, the architecture is clean, the type safety is
strong, and the core features work. It is not yet ready for a public open-source launch.

This document outlines what needs to happen before launch, what features would make the
project stand out, and strategic considerations for building an audience.

---

## Phase 1: Open Source Launch Blockers

These items must be completed before publishing the repository.

### README.md
- [ ] Screenshot or GIF of the app in action (hero image)
- [ ] One-paragraph elevator pitch
- [ ] Prerequisites (Rust, Node, Claude CLI installed and authenticated)
- [ ] Build and install instructions
- [ ] Feature list (with screenshots for key features)
- [ ] Architecture diagram (surface the key diagram from DOCS.md)
- [ ] Link to DOCS.md for detailed technical documentation

### License
- [ ] Add LICENSE file (MIT or Apache-2.0 recommended)
- [ ] Add license header to README

### Testing Foundation
- [ ] Configure Vitest for frontend tests
- [ ] Add Rust unit tests for `AgentManager` (add/remove/update/list)
- [ ] Add Rust unit tests for status detection logic in `process.rs`
- [ ] Add frontend tests for Zustand stores (agentStore, sidebarStore)
- [ ] Add `npm test` and `cargo test` scripts

### CI/CD
- [ ] GitHub Actions workflow: `cargo test`, `cargo clippy`, `npm run build`, `tsc --noEmit`
- [ ] Workflow runs on pull requests and pushes to main

### Code Quality Tooling
- [ ] Add ESLint configuration
- [ ] Add Prettier configuration
- [ ] Add `cargo clippy` to CI (deny warnings)
- [ ] Add `npm run lint` script

### Community Files
- [ ] CONTRIBUTING.md (setup instructions, code style, PR process)
- [ ] CHANGELOG.md (start tracking changes)
- [ ] Issue templates (bug report, feature request)

---

## Phase 2: Production Quality

These improvements bring the app from "impressive prototype" to "reliable tool."

### Agent Persistence
- Persist agent configs across app restarts (SQLite or JSON file at `~/.cadenza/`)
- Restore agent list on startup; reconnect to existing Claude sessions
- Track conversation history locally (not just in-memory)

### Cross-Platform Support
- Abstract `open_terminal` / `open_claude_terminal` behind platform detection
- Replace macOS AppleScript with platform-appropriate terminal launch
- Add Windows process group handling (`CREATE_NEW_PROCESS_GROUP`)
- Test and fix Linux build
- Platform-aware keyboard shortcuts (`Cmd` on macOS, `Ctrl` on Linux/Windows)

### Settings Panel
- Default model selection
- Default permission mode
- Claude binary path configuration (replace hardcoded `resolve_claude_path`)
- Audio notification toggle
- Keyboard shortcut customization
- Default project directory

### Error Handling
- Surface agent stderr in a debug panel (not just console.log)
- Persistent error log accessible from UI
- Retry logic for failed agent spawns
- Better error messages (replace `String(err)` casts with structured errors)

### Accessibility
- ARIA labels on Sidebar (`role="navigation"`), AgentCard (`role="listitem"`)
- `aria-live="polite"` on toast container
- Visible focus indicators on all interactive elements
- Screen reader announcements for status changes
- Color contrast audit (WCAG AA)

### UI Polish
- Extract inline styles to CSS modules (or Tailwind)
- Consolidate magic numbers into a design tokens file
- Fix ErrorBoundary to use theme system
- Consistent spacing scale (4/8/12/16/24/32)
- Consistent type scale with defined roles (heading, body, caption, code)

---

## Phase 3: Differentiation Features

These are the features that make Cadenza unique and worth talking about.

### Agent Templates / Presets
- Save agent configurations as reusable templates
- Template library: "Frontend Dev", "Test Runner", "Code Reviewer", "Docs Writer"
- Share templates between team members (export/import)

### Multi-Agent Workflows
- Broadcast a prompt to all active agents simultaneously
- Agent groups with shared context
- Sequential pipelines: "Agent A writes code → Agent B reviews it"
- Aggregate view: see all agents' status and latest output at a glance

### Conversation History & Search
- Full-text search across all agent messages
- Export conversations to Markdown
- Load and browse previous Claude sessions
- Bookmarkable messages

### Enhanced Git Integration
- Inline diff viewer with accept/reject per hunk
- Branch management per agent
- Commit message suggestions from agent context

### Plugin / Extension API (Long-term)
- Custom sidebar panels
- Custom message renderers
- Custom agent actions and commands
- Event hooks for automation

---

## Phase 4: Distribution & Growth

### Binary Releases
- [ ] Tauri bundle: macOS `.dmg`
- [ ] Tauri bundle: Linux `.AppImage` and `.deb`
- [ ] Tauri bundle: Windows `.msi` (after cross-platform work)
- [ ] GitHub Releases with auto-publish on tagged commits
- [ ] Homebrew formula (macOS)
- [ ] AUR package (Arch Linux)

### Marketing & Community
- Record 60-second demo video
- Post to relevant communities (Claude Discord, Hacker News, r/programming)
- Create GitHub Discussions or Discord for community
- Write a blog post explaining the architecture and design decisions
- Add "Built with Cadenza" badge for user projects

---

## Architecture Highlights to Showcase

These are the parts of the codebase worth calling out as examples of good engineering:

1. **Rust process lifecycle management** (`src-tauri/src/agent/process.rs`)
   - Process group creation via `setpgid` for reliable cleanup
   - Global PID registry with `OnceLock<Mutex<Vec<u32>>>` for app-exit cleanup
   - Graceful stop: SIGTERM → 3s timeout → SIGKILL → respawn with same session
   - NDJSON streaming parser with status inference from message types

2. **Zustand state management** (`src/store/`)
   - Persisted stores with versioned migration (sidebarStore v1→v2)
   - Event-driven state updates via Tauri IPC listeners
   - Selector memoization preventing unnecessary re-renders
   - Double-init guard for React StrictMode

3. **Tauri IPC bridge design**
   - Clean command/event separation (commands for requests, events for streams)
   - Type-safe serialization via serde `rename_all` conventions
   - Managed state via `Arc<Mutex<>>` with Tokio async mutex

4. **Real-time message rendering** (`src/components/MainPanel/MessageStream.tsx`)
   - Streaming NDJSON → typed message objects → grouped tool use blocks
   - Markdown with syntax highlighting, plan mode, interactive question handling
