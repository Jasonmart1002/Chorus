# Message Queue Feature

## Context
During context compaction, the user discovered they could keep typing and messages buffered naturally through the Rust mpsc channel. They want this as a first-class feature: always allow sending messages even when an agent is busy, with a beautiful queue UI showing pending messages and animations.

## Approach
Frontend-only queue in Zustand. The Rust backend already buffers via its mpsc channel — no backend changes needed. When the agent is busy, messages go into a per-agent `pendingQueue`. When the agent finishes (status → `awaiting_input`), the store auto-dequeues and sends the next message.

## Files to modify

### 1. `src/store/agentStore.ts` — Core queue logic

**New state & types:**
- Add `PendingMessage` interface: `{ id, text, queuedAt }`
- Add `pendingQueues: Record<string, PendingMessage[]>` to store state
- Add `clearQueue(agentId)` and `removePendingMessage(agentId, messageId)` actions

**Modify `sendPrompt`:**
- Accept a new `mode` param (`"normal" | "plan"`) — handle plan prefix here instead of in PromptInput
- If agent is `idle` or `awaiting_input`: send immediately (current behavior)
- Otherwise: push to `pendingQueues[agentId]` and toast "Message queued"

**Auto-dequeue in `agent-status-changed` listener:**
- When status becomes `awaiting_input`, check `pendingQueues[agent_id]`
- If queue has messages: shift the first one, add it to `messages`, clear from attention set, and `invoke("send_prompt")` after a short delay (~300ms for visual transition)
- When status becomes `errored` with queued messages: toast a warning, don't auto-dequeue

**Cleanup:**
- In `removeAgent`: also delete `pendingQueues[agentId]`

### 2. `src/components/MainPanel/AgentView.tsx` — Remove disabled guard

- Remove `canSend` / `disabled={!canSend}` logic
- Pass `isWorking` and `queueCount` to PromptInput (informational, not blocking)
- Pass `pendingQueue` to MessageStream for rendering

### 3. `src/components/PromptInput/PromptInput.tsx` — Always enabled

- Replace `disabled` prop with `isWorking` and `queueCount`
- Textarea is **never disabled**
- Move plan-mode text prefixing to `sendPrompt(agentId, text, mode)` so queued messages preserve mode
- Dynamic placeholder: "Agent is working ~ messages will queue" / "N messages queued ~ type more..." / "What shall we work on?"
- Send button: use lavender color when queueing (instead of pink gradient), swap icon to `ListPlus` when will-queue
- Queue badge pill: appears in the bottom bar next to the mode toggle showing "{N} queued" with a `ListOrdered` icon
- Hint text changes: "Cmd+Enter to queue" when working

### 4. `src/components/MainPanel/MessageStream.tsx` — Render queued messages

- Accept new `pendingQueue` prop
- After all rendered messages, show queued messages:
  - `QueueDivider` — centered lavender line with "{N} queued" pill (like ContextCompactPill style)
  - `QueuedMessageBubble` — right-aligned like UserPromptBubble but: dashed border, lavender tint, lower opacity (0.7), "Queued" label with Clock icon, small X button to remove from queue
- Queued bubbles animate in with `queueSlideIn`

### 5. `src/components/MainPanel/ContextSummary.tsx` — Remove canSend guard

- Remove `canSend` variable (line 59)
- Remove `if (!canSend) return;` in `handleGitAction` (line 72) — git actions now queue when busy
- Remove `disabled={!canSend}` from Git button (line 231)

### 6. `src/index.css` — Queue animations

- `queueSlideIn`: slide from right + fade to 0.7 opacity
- `queueBounce`: subtle scale bounce for the badge when count changes

## Edge cases handled
- **Agent errors with queued messages**: toast warning, don't auto-dequeue, user decides
- **Agent removed with queued messages**: cleaned up in removeAgent
- **Vibe mode**: auto-dequeue clears attention set so agent doesn't enter vibe queue between dequeues
- **Stop/restart**: queue preserved, resumes dequeuing after respawn
- **Rapid queuing during compaction**: the original use case — works naturally via FIFO queue

## Verification
- `npm run build` to check TypeScript compiles
- Manual test: send a message, then while agent is working send 2-3 more — verify they appear as queued bubbles
- Verify auto-dequeue fires when agent finishes each task
- Verify queue clears when agent errors (with toast)
- Verify git actions queue when agent is busy
- Test vibe mode doesn't get confused by queued agents
