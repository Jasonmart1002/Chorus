# Chorus: Multi-Agent Command Center — Implementation Plan

This plan transforms Chorus from a Claude Code CLI wrapper into a universal AI agent
orchestration platform supporting Claude, Codex, and Gemini CLIs with feature parity
to the OpenAI Codex Mac app.

---

## Current State Summary

| Feature | Status | Notes |
|---------|--------|-------|
| Claude Code CLI | Done | Only supported engine |
| Parallel agents | Done | Multiple Claude agents in tabs |
| Git diff viewer | Done | 3-tab dialog (unstaged/staged/vs-main) |
| Skills viewer | Done | Read-only plugin scanner |
| Automations | Done | CRUD + cron scheduler |
| Git worktrees | Missing | Agents share working directory |
| Embedded terminals | Missing | Opens external terminal apps |
| Multi-engine support | Missing | Hard-coded to Claude binary |
| MCP configuration | Missing | No MCP UI or config |
| Inbox / results archive | Missing | No notification inbox |
| Cloud execution | Missing | Local-only |
| Adapter layer | Missing | No abstraction over CLI outputs |

---

## Phase 1: Universal CLI Adapter Layer

**Goal:** Abstract away CLI-specific differences so the frontend renders all agents
identically regardless of which engine powers them.

### 1.1 Define the Unified Message Schema (Rust + TypeScript)

Create a normalized event schema that all adapters emit. Every CLI's raw output gets
translated into these types before hitting the frontend.

**New file:** `src-tauri/src/agent/adapter.rs`

```
UnifiedEvent:
  | StreamText { text: String }                       // Incremental assistant text
  | ToolCall { id, name, args, status }               // Agent wants to use a tool
  | ToolResult { id, output, is_error }               // Tool finished
  | AskUser { id, question, options: Vec<String> }    // Agent needs human input
  | PlanProposal { id, description, diff: Option }    // Proposed change for review
  | StatusChange { status: AgentStatus }              // idle/working/awaiting_input
  | ContextCompaction { message: String }             // "Compacting context..."
  | CostUpdate { input_tokens, output_tokens, usd }   // Token usage
  | SessionInfo { session_id, model }                 // Metadata on init
  | Error { message, recoverable: bool }              // Fatal or recoverable error
```

**New file:** `src/types/unified-events.ts` — TypeScript mirror of the above.

**Changes to:** `src/components/MainPanel/MessageStream.tsx` — Refactor to consume
`UnifiedEvent[]` instead of raw `SDKMessage[]`.

### 1.2 Claude Code Adapter

**File:** `src-tauri/src/agent/adapters/claude.rs`

Wrap the existing `process.rs` logic. Claude already outputs `stream-json` NDJSON,
so this adapter is mostly a 1:1 mapping:

- `system/init` → `SessionInfo`
- `assistant` content blocks → `StreamText` + `ToolCall`
- `result/success` → `StatusChange(awaiting_input)`
- `result/error` → `Error`
- Detect `"Compacting context..."` in stderr → `ContextCompaction`
- Intercept `AskUserQuestion` tool calls → `AskUser` (pipe user response back via stdin)
- Cost info from `result` messages → `CostUpdate`

**stdin protocol:** Send JSON lines: `{"type":"user_prompt","text":"..."}` or
`{"type":"tool_result","id":"...","result":"..."}`.

### 1.3 OpenAI Codex CLI Adapter

**File:** `src-tauri/src/agent/adapters/codex.rs`

Codex uses a different binary (`codex`) with different I/O patterns:

- **Binary resolution:** Search PATH for `codex`, then `~/.local/bin/codex`,
  `~/.codex/bin/codex`, npm global bin
- **Spawn args:** `codex --mode suggest` (or `--mode auto-edit` / `--mode full-auto`)
  with `--quiet` flag for reduced ANSI output
- **Config injection:** Before spawning, write/merge
  `~/.codex/config.toml` with system prompt and MCP server entries
- **Output parsing:**
  - Codex outputs ANSI-formatted text (not JSON). Use `strip-ansi-escapes` crate
    to clean output, then parse structured sections (proposed diffs, questions)
  - Detect diff proposals (unified diff format) → `PlanProposal`
  - Detect "Apply changes? [y/n]" prompts → `AskUser`
  - Regular text output → `StreamText`
- **stdin protocol:** Plain text for prompts; `y`/`n` for approval gates
- **Compaction:** Monitor via `/status` command output; inject `/compact` when
  token usage > 80% → `ContextCompaction`

### 1.4 Gemini CLI Adapter

**File:** `src-tauri/src/agent/adapters/gemini.rs`

Gemini is the cleanest to wrap thanks to native JSON streaming:

- **Binary resolution:** Search PATH for `gemini`, then `~/.local/bin/gemini`,
  npm global bin, `~/.gemini/bin/gemini`
- **Spawn args:** `gemini --output-format stream-json` with optional
  `--checkpointing` for state snapshots
- **Output parsing:** Native JSON event stream:
  - `text_delta` events → `StreamText`
  - `tool_call` events → `ToolCall` (with permission gate → `AskUser`)
  - `tool_result` events → `ToolResult`
  - Checkpoint events → map to UI "Save State" actions
- **stdin protocol:** JSON events matching Gemini's expected input format
- **Compaction:** `/compress` command → `ContextCompaction`
- **Context files:** Reads `GEMINI.md` for persistent context (analogous to CLAUDE.md)

### 1.5 Adapter Registry & Engine Selection

**File:** `src-tauri/src/agent/adapters/mod.rs`

```rust
pub trait CliAdapter: Send + Sync {
    fn engine_name(&self) -> &str;
    fn resolve_binary(&self) -> Result<PathBuf>;
    fn build_spawn_args(&self, config: &AgentConfig) -> Vec<String>;
    fn parse_stdout_line(&self, line: &str) -> Vec<UnifiedEvent>;
    fn parse_stderr_line(&self, line: &str) -> Vec<UnifiedEvent>;
    fn format_user_prompt(&self, text: &str) -> Vec<u8>;
    fn format_approval(&self, approved: bool) -> Vec<u8>;
    fn format_ask_response(&self, id: &str, response: &str) -> Vec<u8>;
    fn get_compaction_command(&self) -> Option<&str>;
    fn supports_session_resume(&self) -> bool;
    fn supports_mcp(&self) -> bool;
}
```

**Changes to:** `src-tauri/src/agent/state.rs`
- Add `engine: Engine` enum field (`Claude | Codex | Gemini`) to `AgentConfig`
- Add `session_file: Option<PathBuf>` for engine-specific session persistence

**Changes to:** `src-tauri/src/agent/process.rs`
- Refactor `AgentProcess::spawn()` to accept `Box<dyn CliAdapter>`
- Replace hard-coded Claude args with adapter method calls
- Replace hard-coded NDJSON parsing with `adapter.parse_stdout_line()`
- Emit `UnifiedEvent` variants as Tauri events instead of raw messages

**Changes to:** `src/components/NewAgentDialog.tsx`
- Add engine selector dropdown (Claude / Codex / Gemini)
- Show engine availability status (binary found or not)
- Engine-specific config fields (model name differs per engine)

**Estimated scope:** ~2,000 lines new Rust, ~500 lines new TypeScript, ~800 lines
refactored.

---

## Phase 2: Git Worktree Isolation

**Goal:** Every agent task runs in an isolated git worktree so experiments never
touch the user's active branch.

### 2.1 Worktree Manager

**New file:** `src-tauri/src/git/worktree.rs`

```rust
pub struct WorktreeManager;

impl WorktreeManager {
    /// Creates: git worktree add .chorus-worktrees/{agent_id} -b chorus/{agent_id}
    pub fn create(repo_root: &Path, agent_id: &str) -> Result<WorktreeInfo>;

    /// Lists active worktrees
    pub fn list(repo_root: &Path) -> Result<Vec<WorktreeInfo>>;

    /// Removes worktree and optionally deletes branch
    pub fn remove(repo_root: &Path, agent_id: &str, delete_branch: bool) -> Result<()>;

    /// Returns diff between worktree branch and source branch
    pub fn diff(repo_root: &Path, agent_id: &str) -> Result<String>;

    /// Merges worktree branch back to source
    pub fn merge(repo_root: &Path, agent_id: &str, source_branch: &str) -> Result<()>;
}
```

**Worktree lifecycle:**
1. User creates agent with a project directory
2. `create_agent` command detects git repo → calls `WorktreeManager::create()`
3. Agent process `cwd` is set to the worktree path (not the original repo)
4. Agent works freely — all file changes are isolated
5. On task completion, UI shows diff (worktree vs original branch)
6. User reviews → approves merge / cherry-pick / discard

### 2.2 Worktree-Aware Agent Creation

**Changes to:** `src-tauri/src/commands.rs` (`create_agent`)
- Add `use_worktree: bool` parameter (default true for git repos)
- If enabled: create worktree, store worktree path in `AgentState`
- Set agent process cwd to worktree path

**Changes to:** `src-tauri/src/agent/state.rs`
- Add `worktree_path: Option<PathBuf>` to `AgentState`
- Add `source_branch: Option<String>` to track what branch we branched from

### 2.3 Worktree Diff & Merge UI

**Changes to:** `src/components/DiffDialog.tsx`
- Add fourth tab: "Agent Changes" — shows diff of worktree vs source branch
- File-by-file navigation with expand/collapse
- Per-file accept/reject buttons
- "Merge All" button that calls `worktree_merge` command

**New Tauri commands:**
- `create_worktree(agent_id, repo_path)` → WorktreeInfo
- `remove_worktree(agent_id, delete_branch)` → ()
- `diff_worktree(agent_id)` → String (unified diff)
- `merge_worktree(agent_id, strategy)` → () where strategy = merge | cherry-pick | squash

**Changes to:** `src/components/MainPanel/ContextSummary.tsx`
- Show worktree indicator badge (branch name, isolated status)
- Add "View Agent Diff" button → opens DiffDialog with worktree tab
- Add "Merge to main" and "Discard worktree" actions in git dropdown

**Estimated scope:** ~600 lines new Rust, ~400 lines new TypeScript.

---

## Phase 3: Embedded Per-Thread Terminals

**Goal:** Each agent session gets a dedicated terminal panel embedded in the UI,
running inside its worktree.

### 3.1 Terminal Backend (PTY Management)

**New file:** `src-tauri/src/terminal.rs`

Use the `portable-pty` Rust crate to spawn real pseudo-terminals:

```rust
pub struct EmbeddedTerminal {
    pty_pair: PtyPair,
    child: Box<dyn Child>,
    reader: Box<dyn Read + Send>,
    writer: Box<dyn Write + Send>,
}

impl EmbeddedTerminal {
    pub fn spawn(cwd: &Path, shell: &str) -> Result<Self>;
    pub fn write_input(&mut self, data: &[u8]) -> Result<()>;
    pub fn read_output(&mut self) -> Result<Vec<u8>>;
    pub fn resize(&mut self, cols: u16, rows: u16) -> Result<()>;
    pub fn kill(&mut self) -> Result<()>;
}
```

**New Tauri commands:**
- `terminal_create(agent_id, cwd)` → terminal_id
- `terminal_write(terminal_id, data: Vec<u8>)` → ()
- `terminal_resize(terminal_id, cols, rows)` → ()
- `terminal_kill(terminal_id)` → ()

**Backend event:** `terminal-output` with `{ terminal_id, data: Vec<u8> }` —
streams raw terminal bytes to frontend.

### 3.2 Terminal Frontend (xterm.js)

**New dependency:** `@xterm/xterm` + `@xterm/addon-fit` + `@xterm/addon-web-links`

**New component:** `src/components/Terminal/EmbeddedTerminal.tsx`
- xterm.js instance bound to a `<div>` ref
- Listens to `terminal-output` events → writes to xterm
- Captures keyboard input → sends to `terminal_write` command
- Auto-resizes with `addon-fit` on container resize
- Theme-aware (matches Catppuccin dark/light)

**New component:** `src/components/Terminal/TerminalPanel.tsx`
- Collapsible panel below the message stream (drag handle to resize)
- Tab bar for multiple terminals per agent
- "+" button to spawn additional terminals
- Terminal cwd auto-set to agent's worktree path

### 3.3 Integration with Agent View

**Changes to:** `src/components/MainPanel/AgentView.tsx`
- Add split-pane layout: messages (top) + terminal panel (bottom)
- Terminal panel hidden by default, toggled via button or Cmd+`
- Terminal auto-created when agent is created (optional preference)

**Changes to:** `src/store/agentStore.ts`
- Track `terminals: Map<agent_id, terminal_id[]>` in store
- Auto-cleanup terminals when agent is removed

**Estimated scope:** ~500 lines new Rust, ~600 lines new TypeScript, new npm deps.

---

## Phase 4: Enhanced Diff Review System

**Goal:** Side-by-side diff viewer with per-hunk accept/reject, inline commenting,
and staging controls.

### 4.1 Structured Diff Parsing

**New file:** `src/lib/diff-parser.ts`

Parse unified diff output into structured objects:

```typescript
interface DiffFile {
  oldPath: string;
  newPath: string;
  hunks: DiffHunk[];
  status: 'added' | 'modified' | 'deleted' | 'renamed';
}

interface DiffHunk {
  header: string;
  oldStart: number;
  newStart: number;
  lines: DiffLine[];
  accepted: boolean | null; // null = pending review
}

interface DiffLine {
  type: 'context' | 'add' | 'remove';
  content: string;
  oldLineNo?: number;
  newLineNo?: number;
}
```

### 4.2 Side-by-Side Diff Viewer Component

**New component:** `src/components/Diff/SideBySideDiff.tsx`
- Two-column layout: old file (left) vs new file (right)
- Synchronized scrolling between columns
- Syntax highlighting per language (via existing `react-syntax-highlighter`)
- Line-level gutter with +/- indicators
- Hunk-level accept/reject buttons
- Inline comment input (click line number to add comment)

**New component:** `src/components/Diff/DiffFileTree.tsx`
- Left sidebar showing changed files as a tree
- File status icons (added/modified/deleted/renamed)
- Click to navigate between files
- Badge showing number of hunks pending review

### 4.3 Refactor DiffDialog

**Changes to:** `src/components/DiffDialog.tsx`
- Replace raw text output with `SideBySideDiff` component
- Add file tree navigation
- Add "Accept All" / "Reject All" toolbar buttons
- Add "Stage Selected" button → runs `git add` on accepted files
- Wire into worktree diff for agent-isolated changes

**Estimated scope:** ~1,200 lines new TypeScript/React.

---

## Phase 5: Inbox & Results Archive

**Goal:** Background agents and automations deposit results into an inbox for
asynchronous review.

### 5.1 Inbox Data Model

**New file:** `src-tauri/src/inbox.rs`

```rust
pub struct InboxItem {
    pub id: String,
    pub agent_id: String,
    pub agent_name: String,
    pub automation_id: Option<String>,
    pub title: String,         // Summary of what the agent did
    pub status: InboxStatus,   // unread | read | archived | actioned
    pub result_type: ResultType, // success | error | needs_review
    pub summary: String,       // Agent-generated summary of changes
    pub diff: Option<String>,  // Git diff if changes were made
    pub created_at: DateTime<Utc>,
}
```

**Persistence:** `~/.chorus/inbox.json` — append-only with periodic compaction.

**New Tauri commands:**
- `list_inbox(filter: InboxFilter)` → Vec<InboxItem>
- `mark_inbox_read(id)` / `mark_inbox_archived(id)` / `mark_inbox_actioned(id)`
- `get_inbox_count(filter)` → usize

### 5.2 Inbox Population

**Changes to:** `src-tauri/src/agent/process.rs`
- When an agent reaches `result/success` status after an automation run, auto-create
  an `InboxItem` with the last assistant message as summary
- Include worktree diff if the agent made file changes

**Changes to:** `src-tauri/src/automations.rs`
- After automation fires and agent completes, create inbox entry
- If agent errors, create error inbox entry

### 5.3 Inbox UI

**New component:** `src/components/Inbox/InboxView.tsx`
- List view of inbox items, newest first
- Filter chips: All / Unread / Needs Review / Errors
- Each item shows: agent name, time, summary preview, status badge
- Click to expand: full summary, diff viewer, action buttons

**New component:** `src/components/Inbox/InboxBadge.tsx`
- Unread count badge on sidebar "Inbox" nav item
- Also shown in system tray icon

**Changes to:** `src/components/Sidebar/Sidebar.tsx`
- Add "Inbox" navigation item with unread badge
- Position between agents list and skills/automations

**Changes to:** `src/components/MainPanel/MainPanel.tsx`
- Add `inbox` to the view mode union type
- Render `InboxView` when inbox mode is active

**New store:** `src/store/inboxStore.ts`
- Zustand store for inbox state
- Listen to `inbox-updated` Tauri events
- Cache inbox items with pagination

**Estimated scope:** ~400 lines Rust, ~800 lines TypeScript.

---

## Phase 6: MCP Configuration UI

**Goal:** Let users configure Model Context Protocol servers for each engine,
visually manage connections, and test them.

### 6.1 MCP Config Management

**New file:** `src-tauri/src/mcp.rs`

Read/write MCP configuration files for each engine:

- **Claude:** `~/.claude/claude_desktop_config.json` → `mcpServers` key
- **Codex:** `~/.codex/config.toml` → `[mcp]` section
- **Gemini:** `~/.gemini/settings.json` → `mcpServers` key

```rust
pub struct McpServer {
    pub name: String,
    pub command: String,
    pub args: Vec<String>,
    pub env: HashMap<String, String>,
    pub enabled: bool,
}

pub fn read_mcp_config(engine: Engine) -> Result<Vec<McpServer>>;
pub fn write_mcp_config(engine: Engine, servers: Vec<McpServer>) -> Result<()>;
pub fn test_mcp_server(server: &McpServer) -> Result<McpTestResult>;
```

**New Tauri commands:**
- `list_mcp_servers(engine)` → Vec<McpServer>
- `add_mcp_server(engine, server)` → ()
- `remove_mcp_server(engine, name)` → ()
- `update_mcp_server(engine, name, updates)` → ()
- `test_mcp_server(server)` → McpTestResult

### 6.2 MCP Configuration UI

**New component:** `src/components/MCP/McpView.tsx`
- Engine tabs (Claude / Codex / Gemini)
- List of configured MCP servers per engine
- Add/edit/remove server forms
- Test connection button with status indicator
- Toggle enable/disable per server
- Import from JSON / Export to JSON

**Changes to:** `src/components/Sidebar/Sidebar.tsx`
- Add "MCP Servers" navigation item

**Estimated scope:** ~300 lines Rust, ~500 lines TypeScript.

---

## Phase 7: Enhanced Skills System

**Goal:** Upgrade from read-only skills viewer to full skills management with
creation, editing, and cross-engine support.

### 7.1 Skills CRUD

**Changes to:** `src-tauri/src/skills.rs`
- Add `create_skill(name, content, allowed_tools, engine)` → writes SKILL.md
- Add `update_skill(name, content)` → updates SKILL.md
- Add `delete_skill(name)` → removes file
- Add `import_skill(path)` → copies skill file into plugins dir
- Add `export_skill(name, path)` → copies skill to destination

### 7.2 Skills Editor UI

**Changes to:** `src/components/SkillsView.tsx`
- Add "New Skill" button → opens editor
- Inline markdown editor for skill content
- YAML frontmatter form (name, description, allowed-tools)
- Engine compatibility tags
- "Apply to Agent" button → injects skill into agent prompt

### 7.3 Repository-Level Skills

**New feature:** Detect `.chorus/skills/` directory in project repos
- Auto-load project-specific skills when agent cwd is in that repo
- Show "Project Skills" section in SkillsView
- Team-shareable via git (committed to repo)

**Estimated scope:** ~200 lines Rust, ~400 lines TypeScript.

---

## Phase 8: Cloud Execution Toggle

**Goal:** Allow offloading long-running agent tasks to cloud infrastructure.

### 8.1 Cloud Execution Backend

**New file:** `src-tauri/src/cloud.rs`

This is the most architecturally complex feature and depends on available
cloud providers. Initial implementation targets Claude's cloud execution:

```rust
pub enum ExecutionMode {
    Local,                    // Current behavior
    CloudClaude,              // claude --cloud flag (if/when available)
    CloudCustom(CloudConfig), // User's own infrastructure
}

pub struct CloudConfig {
    pub provider: String,     // "ssh" | "docker" | custom
    pub host: String,
    pub credentials: String,  // Reference to keychain entry
    pub working_dir: String,
}
```

**Initial scope:** Expose a toggle in the UI. When "Cloud" is selected:
- For Claude: Pass `--cloud` or equivalent flag if Anthropic ships cloud execution
- For Codex: Use OpenAI's cloud agent infrastructure
- For Gemini: Use Google's cloud agent infrastructure
- For custom: SSH into a remote machine, sync repo, run CLI there

### 8.2 Cloud Execution UI

**Changes to:** `src/components/NewAgentDialog.tsx`
- Add "Execution Mode" toggle: Local / Cloud
- Cloud config fields (provider, host, etc.)
- Status indicator showing cloud connection health

**Changes to:** `src/components/MainPanel/ContextSummary.tsx`
- Show execution mode badge (local vs cloud icon)

**Note:** This phase is partially speculative. Full cloud execution depends on
each CLI vendor shipping cloud-native APIs. The architecture should be designed
now but implementation may be deferred until vendor APIs are stable.

**Estimated scope:** ~400 lines Rust, ~300 lines TypeScript (initial scaffold).

---

## Phase 9: Interactive Agent Controls

**Goal:** Proper handling of plan mode, approval gates, and context compaction
across all engines with unified UI affordances.

### 9.1 Plan Mode UI

**New component:** `src/components/Agent/PlanReview.tsx`
- Triggered when adapter emits `PlanProposal` event
- Shows proposed changes in diff format
- "Approve" / "Reject" / "Edit & Re-submit" buttons
- Sends approval/rejection back through adapter's stdin protocol

### 9.2 Ask User Modal

**New component:** `src/components/Agent/AskUserModal.tsx`
- Triggered when adapter emits `AskUser` event
- Renders question text + option buttons (if multiple choice)
- Free-text input for open-ended questions
- Sends response back through adapter's stdin protocol
- Auto-focuses when agent enters `awaiting_input` status

**Changes to:** `src/store/agentStore.ts`
- Track pending `AskUser` events per agent
- Auto-surface modal when switching to agent with pending question

### 9.3 Context Compaction Indicator

**Changes to:** `src/components/MainPanel/MessageStream.tsx`
- When `ContextCompaction` event received, show animated spinner with message
- "Compacting context..." / "Compressing chat..." etc.
- Hide spinner when next `StreamText` or `StatusChange` arrives

### 9.4 Token Usage Dashboard

**New component:** `src/components/Agent/TokenUsage.tsx`
- Small bar/meter in ContextSummary showing token usage %
- Color-coded: green (< 50%), yellow (50-80%), red (> 80%)
- Tooltip with exact counts (input/output tokens, cost USD)
- "Compact Now" button when usage > 70%

**Estimated scope:** ~600 lines new TypeScript.

---

## Phase 10: Agent Dashboard & Multi-Agent Coordination

**Goal:** A bird's-eye dashboard for monitoring all active agents simultaneously.

### 10.1 Dashboard View

**New component:** `src/components/Dashboard/AgentDashboard.tsx`
- Grid/card layout showing all active agents
- Each card shows: agent name, engine, status, last message preview, token usage
- Color-coded status borders (working=blue, awaiting=yellow, error=red)
- Click card to navigate to agent's full view
- Drag-and-drop to reorder

### 10.2 Agent Coordination

**Changes to:** `src/store/agentStore.ts`
- Add `agentGroups: Map<group_id, agent_id[]>` for grouping related agents
- Add `createAgentGroup(name, agent_ids)` action
- Group-level actions: pause all, resume all, kill all

**New component:** `src/components/Dashboard/AgentGroup.tsx`
- Visual grouping of related agents
- Shared context indicator (e.g., "All working on /myproject")
- Group-level progress bar

**Changes to:** `src/components/Sidebar/Sidebar.tsx`
- Add "Dashboard" navigation item at top
- Show active agent count badge

**Estimated scope:** ~700 lines new TypeScript.

---

## Implementation Priority & Dependencies

```
Phase 1 (Adapter Layer)         ← MUST be first, everything depends on it
  ↓
Phase 2 (Git Worktrees)         ← Independent, high safety value
Phase 9 (Interactive Controls)  ← Depends on Phase 1 adapter events
  ↓
Phase 3 (Embedded Terminals)    ← Independent, depends on Phase 2 for cwd
Phase 4 (Diff Review)           ← Depends on Phase 2 for worktree diffs
Phase 5 (Inbox)                 ← Depends on Phase 1 for unified events
  ↓
Phase 6 (MCP Config)            ← Independent, enhances Phase 1 adapters
Phase 7 (Skills Enhancement)    ← Independent, low coupling
Phase 10 (Dashboard)            ← Depends on Phase 1, low coupling
  ↓
Phase 8 (Cloud Execution)       ← Depends on vendor APIs, defer if needed
```

### Recommended Sprint Breakdown

| Sprint | Phases | Focus |
|--------|--------|-------|
| Sprint 1 (Weeks 1-3) | Phase 1 | Adapter layer + Claude adapter refactor |
| Sprint 2 (Weeks 4-5) | Phase 1 cont. | Codex + Gemini adapters |
| Sprint 3 (Weeks 6-7) | Phase 2 + 9 | Git worktrees + interactive controls |
| Sprint 4 (Weeks 8-9) | Phase 3 + 4 | Embedded terminals + diff review |
| Sprint 5 (Weeks 10-11) | Phase 5 + 6 | Inbox + MCP config |
| Sprint 6 (Weeks 12-13) | Phase 7 + 10 | Skills enhancement + dashboard |
| Sprint 7 (Week 14+) | Phase 8 | Cloud execution (if vendor APIs ready) |

---

## New Dependencies Required

### Rust (Cargo.toml)
- `portable-pty = "0.8"` — Cross-platform pseudo-terminal (Phase 3)
- `strip-ansi-escapes = "0.2"` — ANSI code stripping for Codex output (Phase 1)
- `similar = "2"` — Diff computation (Phase 4)
- `toml = "0.8"` — Codex config.toml parsing (Phase 1)
- `notify = "6"` — File system watching for worktree changes (Phase 2)

### npm (package.json)
- `@xterm/xterm` + `@xterm/addon-fit` + `@xterm/addon-web-links` — Terminal emulator (Phase 3)
- `diff2html` — Rich diff rendering (Phase 4, alternative to custom implementation)

---

## New Files Summary

### Rust Backend (~4,400 lines new)
```
src-tauri/src/agent/adapter.rs           # UnifiedEvent types
src-tauri/src/agent/adapters/mod.rs      # CliAdapter trait + registry
src-tauri/src/agent/adapters/claude.rs   # Claude Code adapter
src-tauri/src/agent/adapters/codex.rs    # OpenAI Codex adapter
src-tauri/src/agent/adapters/gemini.rs   # Gemini CLI adapter
src-tauri/src/git/mod.rs                 # Git module
src-tauri/src/git/worktree.rs            # Worktree manager
src-tauri/src/terminal.rs               # Embedded PTY manager
src-tauri/src/inbox.rs                   # Inbox data & persistence
src-tauri/src/mcp.rs                     # MCP config manager
src-tauri/src/cloud.rs                   # Cloud execution scaffold
```

### TypeScript Frontend (~5,500 lines new)
```
src/types/unified-events.ts              # UnifiedEvent types
src/lib/diff-parser.ts                   # Structured diff parsing
src/store/inboxStore.ts                  # Inbox state
src/components/Terminal/EmbeddedTerminal.tsx
src/components/Terminal/TerminalPanel.tsx
src/components/Diff/SideBySideDiff.tsx
src/components/Diff/DiffFileTree.tsx
src/components/Agent/PlanReview.tsx
src/components/Agent/AskUserModal.tsx
src/components/Agent/TokenUsage.tsx
src/components/Inbox/InboxView.tsx
src/components/Inbox/InboxBadge.tsx
src/components/MCP/McpView.tsx
src/components/Dashboard/AgentDashboard.tsx
src/components/Dashboard/AgentGroup.tsx
```

### Modified Files (~2,000 lines changed)
```
src-tauri/src/agent/process.rs           # Refactor to use adapters
src-tauri/src/agent/state.rs             # Add engine, worktree fields
src-tauri/src/commands.rs                # New commands, engine param
src-tauri/src/lib.rs                     # Register new state & commands
src-tauri/src/automations.rs             # Inbox integration
src-tauri/src/skills.rs                  # CRUD operations
src-tauri/Cargo.toml                     # New dependencies
src/components/MainPanel/MainPanel.tsx   # New view modes
src/components/MainPanel/AgentView.tsx   # Terminal panel, split pane
src/components/MainPanel/MessageStream.tsx # UnifiedEvent rendering
src/components/MainPanel/ContextSummary.tsx # Worktree, cloud badges
src/components/Sidebar/Sidebar.tsx       # New nav items
src/components/DiffDialog.tsx            # Side-by-side upgrade
src/components/NewAgentDialog.tsx        # Engine selector
src/components/SkillsView.tsx            # Skills CRUD
src/store/agentStore.ts                  # Multi-engine, terminals
src/types/agent.ts                       # Engine enum
src/types/messages.ts                    # UnifiedEvent integration
package.json                             # New dependencies
```

---

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Codex CLI output format changes | High | Pin to specific version, add format detection |
| Gemini CLI JSON schema undocumented | Medium | Build adapter against observed output, add fallbacks |
| PTY management across platforms | Medium | Use `portable-pty` crate (battle-tested in VS Code) |
| Git worktree conflicts on merge | Low | Show conflicts in diff UI, let user resolve manually |
| Cloud execution vendor API instability | High | Defer Phase 8, design interface now but implement later |
| xterm.js bundle size (~400KB) | Low | Lazy-load terminal component, code-split |
| Context window limits vary by engine | Medium | Adapter reports max tokens, UI adapts compaction strategy |

---

## Total Estimated Scope

- **~4,400 lines** new Rust code
- **~5,500 lines** new TypeScript/React code
- **~2,000 lines** modified across existing files
- **~11,900 lines** total
- **~14 weeks** estimated timeline (1 developer, full-time)
- **5 new Rust crate dependencies**
- **3 new npm package dependencies**
