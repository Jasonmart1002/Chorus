import { useEffect, useRef, useState } from "react";
import {
  Terminal,
  CheckCircle,
  AlertCircle,
  Wrench,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  FileText,
  User,
  Pencil,
  Globe,
  Search,
  FolderSearch,
  ListTodo,
  Layers,
  RotateCcw,
} from "lucide-react";
import type {
  SDKMessage,
  ResultMessage,
  ToolResultBlock,
  ToolUseBlock,
} from "../../types/messages";
import { useAgentStore } from "../../store/agentStore";
import { useThemeStore } from "../../store/themeStore";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { MarkdownRenderer } from "../ui/MarkdownRenderer";

// ---------------------------------------------------------------------------
// Tool icon & summary maps
// ---------------------------------------------------------------------------

const TOOL_ICONS: Record<string, typeof Wrench> = {
  Read: FileText,
  Edit: Pencil,
  Write: FileText,
  Bash: Terminal,
  Glob: FolderSearch,
  Grep: Search,
  WebSearch: Globe,
  WebFetch: Globe,
  Task: ListTodo,
  TaskCreate: ListTodo,
  TaskUpdate: ListTodo,
};

const TOOL_SUMMARIES: Record<string, (input: Record<string, unknown>) => string> = {
  Read: (input) => `${input.file_path || ""}`,
  Edit: (input) => `${input.file_path || ""}`,
  Write: (input) => `${input.file_path || ""}`,
  Bash: (input) => `${(input.command as string || "").substring(0, 80)}`,
  Glob: (input) => `${input.pattern || ""}`,
  Grep: (input) => `${input.pattern || ""}`,
  Task: (input) => `${input.description || ""}`,
  TaskCreate: (input) => `${input.subject || ""}`,
  TaskUpdate: (input) => `#${input.taskId || ""} → ${input.status || ""}`,
  EnterPlanMode: () => "Entering plan mode",
  WebSearch: (input) => `"${input.query || ""}"`,
  WebFetch: (input) => `${input.url || ""}`,
};

// ---------------------------------------------------------------------------
// Props & types
// ---------------------------------------------------------------------------

interface Props {
  messages: SDKMessage[];
  agentId: string;
}

type RenderItem =
  | { kind: "text"; text: string; key: string }
  | { kind: "tool_use"; block: ToolUseBlock; key: string }
  | { kind: "tool_result"; block: ToolResultBlock; key: string }
  | { kind: "tool_group"; name: string; blocks: ToolUseBlock[]; key: string }
  | { kind: "activity_group"; blocks: ToolUseBlock[]; key: string }
  | { kind: "result"; message: ResultMessage; key: string }
  | { kind: "user_prompt"; text: string; key: string }
  | { kind: "system_init"; key: string }
  | { kind: "context_compact"; key: string }
  | { kind: "fresh_session"; key: string }
  | { kind: "ask_user"; block: ToolUseBlock; key: string }
  | { kind: "plan"; block: ToolUseBlock; key: string };

// ---------------------------------------------------------------------------
// Message filtering & flattening
// ---------------------------------------------------------------------------

function isCompactMessage(msg: SDKMessage): boolean {
  if (msg.type !== "system") return false;
  const subtype = (msg as { subtype?: string }).subtype || "";
  // Claude Code signals compaction via system messages with compact-related subtypes
  // or SessionStart with source: "compact"
  if (subtype.toLowerCase().includes("compact")) return true;
  if (
    subtype.toLowerCase().includes("session") &&
    (msg as Record<string, unknown>).source === "compact"
  )
    return true;
  return false;
}

function shouldHideMessage(msg: SDKMessage): boolean {
  if (msg.type === "system" && !isCompactMessage(msg) && (msg as { subtype?: string }).subtype?.startsWith("hook_")) return true;
  return false;
}

function flattenMessages(messages: SDKMessage[]): RenderItem[] {
  const items: RenderItem[] = [];
  let seenInit = false;
  let seq = 0;

  for (const msg of messages) {
    switch (msg.type) {
      case "user_prompt":
        items.push({ kind: "user_prompt", text: msg.text, key: `up-${seq++}` });
        break;
      case "system":
        if (msg.subtype === "init" && !seenInit) {
          seenInit = true;
          items.push({ kind: "system_init", key: `si-${seq++}` });
        } else if (isCompactMessage(msg)) {
          items.push({ kind: "context_compact", key: `cc-${seq++}` });
        } else if (msg.subtype === "fresh_session") {
          items.push({ kind: "fresh_session", key: `fs-${seq++}` });
        }
        break;
      case "assistant": {
        const content = msg.message?.content;
        if (content) {
          for (const block of content) {
            if (block.type === "text" && block.text.trim()) {
              items.push({ kind: "text", text: block.text, key: `txt-${seq++}` });
            } else if (block.type === "tool_use") {
              const tb = block as ToolUseBlock;
              if (tb.name === "AskUserQuestion") {
                items.push({ kind: "ask_user", block: tb, key: `ask-${tb.id}` });
              } else if (tb.name === "ExitPlanMode") {
                items.push({ kind: "plan", block: tb, key: `plan-${tb.id}` });
              } else {
                items.push({ kind: "tool_use", block: tb, key: `tu-${tb.id}` });
              }
            } else if (block.type === "tool_result") {
              items.push({
                kind: "tool_result",
                block: block as ToolResultBlock,
                key: `tr-${(block as ToolResultBlock).tool_use_id}-${seq++}`,
              });
            }
          }
        }
        break;
      }
      case "result":
        items.push({ kind: "result", message: msg, key: `res-${seq++}` });
        break;
    }
  }
  return items;
}

function groupConsecutiveToolItems(items: RenderItem[]): RenderItem[] {
  const result: RenderItem[] = [];
  let i = 0;
  while (i < items.length) {
    const item = items[i];
    if (item.kind === "tool_use") {
      // Collect ALL consecutive tool_use items regardless of name
      let j = i + 1;
      while (j < items.length && items[j].kind === "tool_use") {
        j++;
      }
      const run = items.slice(i, j).map(
        (it) => (it as { kind: "tool_use"; block: ToolUseBlock }).block
      );
      if (run.length >= 2) {
        const groupKey = `grp-${run[0].id}`;
        // Check if all the same name — use simpler tool_group
        const allSameName = run.every((b) => b.name === run[0].name);
        if (allSameName) {
          result.push({ kind: "tool_group", name: run[0].name, blocks: run, key: groupKey });
        } else {
          result.push({ kind: "activity_group", blocks: run, key: groupKey });
        }
      } else {
        result.push(item);
      }
      i = j;
    } else {
      result.push(item);
      i++;
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function MessageStream({ messages, agentId }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const theme = useThemeStore((s) => s.current);
  const prevLenRef = useRef(messages.length);

  // Scroll to bottom when switching agents
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "instant" });
    prevLenRef.current = messages.length;
  }, [agentId]);

  // Smooth scroll when new messages arrive
  useEffect(() => {
    if (messages.length > prevLenRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevLenRef.current = messages.length;
  }, [messages.length]);

  const visible = messages.filter((m) => !shouldHideMessage(m));

  // --- Empty state ---
  if (visible.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          color: theme.textMuted,
          fontFamily: theme.fontBody,
          userSelect: "none",
        }}
      >
        <span style={{ fontSize: 28, opacity: 0.5 }}>~</span>
        <span
          style={{
            fontSize: 14,
            fontFamily: theme.fontHeading,
            letterSpacing: "0.02em",
          }}
        >
          Send a prompt to start the conversation
        </span>
        <span style={{ fontSize: 11, opacity: 0.6 }}>
          Your messages will appear here
        </span>
      </div>
    );
  }

  const flat = flattenMessages(visible);
  const grouped = groupConsecutiveToolItems(flat);

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        overflowY: "auto",
        padding: "20px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        fontFamily: theme.fontBody,
      }}
    >
      {grouped.map((item) => (
        <RenderItemView key={item.key} item={item} agentId={agentId} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Item dispatcher
// ---------------------------------------------------------------------------

function RenderItemView({ item, agentId }: { item: RenderItem; agentId: string }) {
  switch (item.kind) {
    case "user_prompt":
      return <UserPromptBubble text={item.text} />;
    case "system_init":
      return <SystemInitPill />;
    case "context_compact":
      return <ContextCompactPill />;
    case "fresh_session":
      return <FreshSessionPill />;
    case "text":
      return <AssistantText text={item.text} />;
    case "tool_use":
      return <ToolUseView block={item.block} />;
    case "tool_result":
      return <ToolResultView block={item.block} />;
    case "tool_group":
      return <ToolGroupView name={item.name} blocks={item.blocks} />;
    case "activity_group":
      return <ActivityGroupView blocks={item.blocks} />;
    case "ask_user":
      return <AskUserQuestionView block={item.block} agentId={agentId} />;
    case "plan":
      return <PlanView block={item.block} agentId={agentId} />;
    case "result":
      return <ResultView message={item.message} />;
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// User Prompt Bubble — right-aligned cute speech bubble
// ---------------------------------------------------------------------------

function UserPromptBubble({ text }: { text: string }) {
  const theme = useThemeStore((s) => s.current);

  return (
    <div style={{ display: "flex", justifyContent: "flex-end" }}>
      <div
        style={{
          maxWidth: "75%",
          padding: "10px 14px",
          borderRadius: "16px 16px 4px 16px",
          background: theme.pinkLight,
          border: `2px solid ${theme.borderStrong}`,
          boxShadow: theme.shadowChunky,
          position: "relative",
        }}
      >
        {/* "You" label */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            marginBottom: 6,
          }}
        >
          <User size={11} color={theme.pink} strokeWidth={2.5} />
          <span
            style={{
              fontSize: 11,
              color: theme.pink,
              fontWeight: 700,
              fontFamily: theme.fontHeading,
              letterSpacing: "0.02em",
            }}
          >
            You
          </span>
          <span style={{ fontSize: 10, color: theme.pink, opacity: 0.6 }}>
          </span>
        </div>

        {/* Message text */}
        <div
          style={{
            fontSize: 13,
            color: theme.textPrimary,
            lineHeight: 1.6,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            fontFamily: theme.fontBody,
          }}
        >
          {text}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// System Init — centered sparkle pill
// ---------------------------------------------------------------------------

function SystemInitPill() {
  const theme = useThemeStore((s) => s.current);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        padding: "4px 0",
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 14px",
          borderRadius: theme.borderRadiusFull,
          background: theme.bgCard,
          border: `1px solid ${theme.borderColor}`,
          fontSize: 11,
          color: theme.textMuted,
          fontFamily: theme.fontBody,
          fontWeight: 600,
          userSelect: "none",
        }}
      >
        <span style={{ fontSize: 12 }}>&#10024;</span>
        <span>Session started</span>
        <span style={{ fontSize: 12 }}>&#10024;</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Context Compacted — centered divider pill
// ---------------------------------------------------------------------------

function ContextCompactPill() {
  const theme = useThemeStore((s) => s.current);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "8px 0",
        userSelect: "none",
      }}
    >
      <div
        style={{
          flex: 1,
          height: 1,
          background: theme.lavender,
          opacity: 0.3,
        }}
      />
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 14px",
          borderRadius: theme.borderRadiusFull,
          background: theme.bgCard,
          border: `1px solid ${theme.lavender}40`,
          fontSize: 11,
          color: theme.lavender,
          fontFamily: theme.fontBody,
          fontWeight: 600,
        }}
      >
        <Layers size={11} strokeWidth={2.5} />
        <span>Context compacted</span>
      </div>
      <div
        style={{
          flex: 1,
          height: 1,
          background: theme.lavender,
          opacity: 0.3,
        }}
      />
    </div>
  );
}

function FreshSessionPill() {
  const theme = useThemeStore((s) => s.current);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        padding: "6px 0",
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "5px 14px",
          borderRadius: theme.borderRadiusFull,
          background: theme.goldLight,
          border: `1px solid ${theme.gold}55`,
          fontSize: 11,
          color: theme.gold,
          fontFamily: theme.fontBody,
          fontWeight: 700,
        }}
      >
        <RotateCcw size={11} strokeWidth={2.5} />
        <span>New session started for this engine</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Assistant Text — cozy full-width markdown
// ---------------------------------------------------------------------------

function AssistantText({ text }: { text: string }) {
  return (
    <div style={{ padding: "2px 0" }}>
      <MarkdownRenderer content={text} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Result Messages — success / error banners
// ---------------------------------------------------------------------------

function ResultView({ message }: { message: ResultMessage }) {
  const theme = useThemeStore((s) => s.current);
  const isError = message.subtype !== "success";
  const bg = isError ? theme.peachLight : theme.mintLight;
  const border = isError ? theme.peach : theme.mint;
  const iconColor = isError ? theme.peach : theme.mint;

  return (
    <div
      style={{
        padding: "10px 14px",
        borderRadius: theme.borderRadius,
        background: bg,
        border: `2px solid ${border}`,
        display: "flex",
        alignItems: "center",
        gap: 10,
        fontSize: 12,
        color: theme.textSecondary,
        fontFamily: theme.fontBody,
      }}
    >
      {isError ? (
        <AlertCircle size={14} color={iconColor} strokeWidth={2.5} style={{ flexShrink: 0 }} />
      ) : (
        <CheckCircle size={14} color={iconColor} strokeWidth={2.5} style={{ flexShrink: 0 }} />
      )}

      {isError && (
        <span
          style={{
            color: theme.textPrimary,
            fontSize: 12,
            fontFamily: theme.fontBody,
            flex: 1,
            lineHeight: 1.4,
          }}
        >
          {(message.result || "").substring(0, 300)}
        </span>
      )}

      <span
        style={{
          color: theme.textSecondary,
          fontWeight: 600,
          fontFamily: theme.fontHeading,
          fontSize: 11,
          letterSpacing: "0.02em",
          whiteSpace: "nowrap",
        }}
      >
        {isError ? "Error" : "Turn complete \u2713"}
      </span>
    </div>
  );
}

function ToolResultView({ block }: { block: ToolResultBlock }) {
  const theme = useThemeStore((s) => s.current);

  return (
    <div
      style={{
        padding: "10px 12px",
        borderRadius: theme.borderRadius,
        background: theme.bgCard,
        border: `1.5px solid ${theme.borderColor}`,
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          fontFamily: theme.fontHeading,
          color: theme.textMuted,
          marginBottom: 6,
          letterSpacing: "0.03em",
          textTransform: "uppercase",
        }}
      >
        Tool Result
      </div>
      <MarkdownRenderer content={block.content || ""} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tool Use — cute mini-window
// No overflow:hidden on wrapper — border-radius applied to children directly
// to avoid WebKit clipping bugs inside scrollable flex containers.
// ---------------------------------------------------------------------------

function ToolUseView({ block, nested }: { block: ToolUseBlock; nested?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const theme = useThemeStore((s) => s.current);
  const input = (block.input || {}) as Record<string, unknown>;
  const toolName = block.name || "Tool";
  const summaryFn = TOOL_SUMMARIES[toolName];
  const summary = summaryFn ? summaryFn(input) : "";
  const Icon = TOOL_ICONS[toolName] || Wrench;

  const codeBg = theme.bgBase;

  const outerRadius = nested ? 0 : theme.borderRadius;
  // When collapsed, full border-radius on title bar. When expanded, only top corners.
  const titleRadius = nested
    ? 0
    : expanded
      ? `${outerRadius}px ${outerRadius}px 0 0`
      : outerRadius;
  const contentRadius = nested ? 0 : `0 0 ${outerRadius}px ${outerRadius}px`;

  return (
    <div
      style={{
        border: nested ? undefined : `2px solid ${theme.borderStrong}`,
        borderRadius: outerRadius,
        boxShadow: nested ? undefined : theme.shadowChunky,
        minWidth: 0,
      }}
    >
      {/* Title bar — mini-window header */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: "8px 12px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          cursor: "pointer",
          userSelect: "none",
          background: theme.bgCard,
          borderBottom: expanded ? `1px solid ${theme.borderColor}` : undefined,
          borderTop: nested ? `1px solid ${theme.borderColor}` : undefined,
          borderRadius: titleRadius,
          transition: `background 0.15s ease`,
          minHeight: 34,
          minWidth: 0,
        }}
      >
        {/* Window button dot */}
        <span
          style={{
            display: "inline-block",
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: theme.lavender,
            border: `1.5px solid ${theme.borderStrong}`,
            flexShrink: 0,
          }}
        />

        {/* Tool icon */}
        <Icon size={12} color={theme.lavender} strokeWidth={2.5} style={{ flexShrink: 0 }} />

        {/* Tool name */}
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: theme.textPrimary,
            fontFamily: theme.fontHeading,
            letterSpacing: "0.01em",
            whiteSpace: "nowrap",
          }}
        >
          {toolName}
        </span>

        {/* Summary */}
        {summary && (
          <span
            style={{
              fontSize: 11,
              color: theme.textMuted,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flex: 1,
              minWidth: 0,
              fontFamily: theme.fontCode,
            }}
          >
            {summary}
          </span>
        )}

        {/* Collapse chevron */}
        <span style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>
          {expanded ? (
            <ChevronDown size={13} color={theme.textMuted} />
          ) : (
            <ChevronRight size={13} color={theme.textMuted} />
          )}
        </span>
      </div>

      {/* Expanded JSON panel */}
      {expanded && (
        <div
          style={{
            padding: "10px 14px",
            fontSize: 11,
            color: theme.textSecondary,
            fontFamily: theme.fontCode,
            maxHeight: 240,
            overflow: "auto",
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
            background: codeBg,
            borderRadius: contentRadius,
            lineHeight: 1.5,
          }}
        >
          {JSON.stringify(input, null, 2)}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tool Group — mini-window with count badge
// ---------------------------------------------------------------------------

function ToolGroupView({ name, blocks }: { name: string; blocks: ToolUseBlock[] }) {
  const [expanded, setExpanded] = useState(false);
  const theme = useThemeStore((s) => s.current);
  const toolName = name || "Tool";
  const summaryFn = TOOL_SUMMARIES[toolName];
  const Icon = TOOL_ICONS[toolName] || Wrench;

  const summaries = blocks
    .map((b) => {
      const input = (b.input || {}) as Record<string, unknown>;
      return summaryFn ? summaryFn(input) : "";
    })
    .filter(Boolean);

  const preview =
    summaries.length <= 2
      ? summaries.join(", ")
      : `${summaries[0]}, ${summaries[1]}, +${summaries.length - 2}`;

  const outerRadius = theme.borderRadius;
  const titleRadius = expanded
    ? `${outerRadius}px ${outerRadius}px 0 0`
    : outerRadius;
  const contentRadius = `0 0 ${outerRadius}px ${outerRadius}px`;

  return (
    <div
      style={{
        borderRadius: outerRadius,
        border: `2px solid ${theme.borderStrong}`,
        boxShadow: theme.shadowChunky,
        minWidth: 0,
      }}
    >
      {/* Title bar */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: "8px 12px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          cursor: "pointer",
          userSelect: "none",
          background: theme.bgCard,
          borderBottom: expanded ? `1px solid ${theme.borderColor}` : undefined,
          borderRadius: titleRadius,
          transition: `background 0.15s ease`,
          minHeight: 34,
          minWidth: 0,
        }}
      >
        {/* Window button dot */}
        <span
          style={{
            display: "inline-block",
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: theme.lavender,
            border: `1.5px solid ${theme.borderStrong}`,
            flexShrink: 0,
          }}
        />

        {/* Tool icon */}
        <Icon size={12} color={theme.lavender} strokeWidth={2.5} style={{ flexShrink: 0 }} />

        {/* Tool name */}
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: theme.textPrimary,
            fontFamily: theme.fontHeading,
            letterSpacing: "0.01em",
            whiteSpace: "nowrap",
          }}
        >
          {toolName}
        </span>

        {/* Count badge pill */}
        <Badge variant="count" color={theme.lavender}>
          &times;{blocks.length}
        </Badge>

        {/* Summary preview */}
        {!expanded && preview && (
          <span
            style={{
              fontSize: 11,
              color: theme.textMuted,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flex: 1,
              minWidth: 0,
              fontFamily: theme.fontCode,
            }}
          >
            {preview}
          </span>
        )}

        {/* Collapse chevron */}
        <span style={{ flexShrink: 0, display: "flex", alignItems: "center", marginLeft: "auto" }}>
          {expanded ? (
            <ChevronDown size={13} color={theme.textMuted} />
          ) : (
            <ChevronRight size={13} color={theme.textMuted} />
          )}
        </span>
      </div>

      {/* Expanded: nested tool views */}
      {expanded && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            borderRadius: contentRadius,
            overflow: "hidden",
          }}
        >
          {blocks.map((b, i) => (
            <ToolUseView key={b.id} block={b} nested />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Activity Group — condensed mixed-tool summary
// ---------------------------------------------------------------------------

function ActivityGroupView({ blocks }: { blocks: ToolUseBlock[] }) {
  const [expanded, setExpanded] = useState(false);
  const theme = useThemeStore((s) => s.current);

  // Build counts by tool name
  const counts: Record<string, number> = {};
  for (const b of blocks) {
    counts[b.name] = (counts[b.name] || 0) + 1;
  }
  const parts = Object.entries(counts).map(([name, count]) => {
    const Icon = TOOL_ICONS[name] || Wrench;
    return { name, count, Icon };
  });

  const outerRadius = theme.borderRadius;
  const titleRadius = expanded
    ? `${outerRadius}px ${outerRadius}px 0 0`
    : outerRadius;
  const contentRadius = `0 0 ${outerRadius}px ${outerRadius}px`;

  return (
    <div
      style={{
        borderRadius: outerRadius,
        border: `2px solid ${theme.borderStrong}`,
        boxShadow: theme.shadowChunky,
        minWidth: 0,
      }}
    >
      {/* Title bar */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: "8px 12px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          cursor: "pointer",
          userSelect: "none",
          background: theme.bgCard,
          borderBottom: expanded ? `1px solid ${theme.borderColor}` : undefined,
          borderRadius: titleRadius,
          transition: `background 0.15s ease`,
          minHeight: 34,
          minWidth: 0,
        }}
      >
        {/* Window button dot */}
        <span
          style={{
            display: "inline-block",
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: theme.lavender,
            border: `1.5px solid ${theme.borderStrong}`,
            flexShrink: 0,
          }}
        />

        {/* Tool breakdown pills */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            flex: 1,
            minWidth: 0,
            overflow: "hidden",
          }}
        >
          {parts.map(({ name, count, Icon }) => (
            <span
              key={name}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "2px 8px",
                borderRadius: theme.borderRadiusFull,
                background: theme.bgBase,
                border: `1.5px solid ${theme.borderColor}`,
                fontSize: 10,
                fontWeight: 700,
                fontFamily: theme.fontHeading,
                color: theme.textSecondary,
                whiteSpace: "nowrap",
                letterSpacing: "0.01em",
              }}
            >
              <Icon size={10} color={theme.lavender} strokeWidth={2.5} />
              {name}
              {count > 1 && (
                <span style={{ color: theme.lavender, fontFamily: theme.fontCode }}>
                  &times;{count}
                </span>
              )}
            </span>
          ))}
        </div>

        {/* Total count badge */}
        <Badge variant="count" color={theme.lavender}>
          {blocks.length}
        </Badge>

        {/* Collapse chevron */}
        <span style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>
          {expanded ? (
            <ChevronDown size={13} color={theme.textMuted} />
          ) : (
            <ChevronRight size={13} color={theme.textMuted} />
          )}
        </span>
      </div>

      {/* Expanded: nested tool views */}
      {expanded && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            borderRadius: contentRadius,
            overflow: "hidden",
          }}
        >
          {blocks.map((b, i) => (
            <ToolUseView key={b.id} block={b} nested />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// AskUserQuestion — interactive kawaii card
// ---------------------------------------------------------------------------

interface QuestionOption {
  label: string;
  description?: string;
}

interface Question {
  question: string;
  header?: string;
  options: QuestionOption[];
  multiSelect?: boolean;
}

function AskUserQuestionView({ block, agentId }: { block: ToolUseBlock; agentId: string }) {
  const input = block.input as { questions?: Question[] };
  const questions = input.questions || [];
  const sendPrompt = useAgentStore((s) => s.sendPrompt);
  const agentStatus = useAgentStore((s) => s.agents[agentId]?.status);
  const theme = useThemeStore((s) => s.current);
  const [answered, setAnswered] = useState<Record<number, string[]>>({});

  const handleSelect = (qIdx: number, label: string, multi: boolean) => {
    setAnswered((prev) => {
      const current = prev[qIdx] || [];
      if (multi) {
        return {
          ...prev,
          [qIdx]: current.includes(label) ? current.filter((l) => l !== label) : [...current, label],
        };
      }
      return { ...prev, [qIdx]: [label] };
    });
  };

  const handleSubmit = async () => {
    const parts: string[] = [];
    questions.forEach((q, i) => {
      const selected = answered[i] || [];
      if (selected.length > 0) {
        parts.push(`${q.question} → ${selected.join(", ")}`);
      }
    });
    if (parts.length > 0) {
      await sendPrompt(agentId, parts.join("\n"));
    }
  };

  const allAnswered = questions.every((_, i) => (answered[i] || []).length > 0);
  const canRespond = agentStatus === "awaiting_input";

  return (
    <div
      style={{
        borderRadius: theme.borderRadius,
        background: theme.pinkLight,
        border: `2px solid ${theme.borderStrong}`,
        boxShadow: theme.shadowChunky,
        overflow: "hidden",
      }}
    >
      {/* Header bar */}
      <div
        style={{
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          borderBottom: `1px solid ${theme.borderColor}`,
          background: theme.pinkLight,
        }}
      >
        <HelpCircle size={15} color={theme.pink} strokeWidth={2.5} />
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: theme.textPrimary,
            fontFamily: theme.fontHeading,
            letterSpacing: "0.01em",
          }}
        >
          Agent has a question!
        </span>
        <span style={{ fontSize: 13 }}>&#128172;</span>
      </div>

      {/* Question body */}
      <div style={{ padding: "14px 16px" }}>
        {questions.map((q, qIdx) => (
          <div key={qIdx} style={{ marginBottom: qIdx < questions.length - 1 ? 16 : 0 }}>
            {q.header && (
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: theme.textMuted,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: 4,
                  fontFamily: theme.fontHeading,
                }}
              >
                {q.header}
              </div>
            )}
            <div
              style={{
                fontSize: 13,
                color: theme.textPrimary,
                marginBottom: 10,
                lineHeight: 1.5,
                fontFamily: theme.fontBody,
              }}
            >
              {q.question}
            </div>

            {/* Option buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {q.options.map((opt) => {
                const selected = (answered[qIdx] || []).includes(opt.label);
                return (
                  <Button
                    key={opt.label}
                    variant={selected ? "primary" : "secondary"}
                    onClick={() => canRespond && handleSelect(qIdx, opt.label, !!q.multiSelect)}
                    disabled={!canRespond}
                    style={{
                      justifyContent: "flex-start",
                      textAlign: "left",
                      padding: "10px 14px",
                      background: selected ? theme.pinkLight : theme.bgSurface,
                      border: selected ? `2px solid ${theme.pink}` : `2px solid ${theme.borderColor}`,
                      color: theme.textPrimary,
                      boxShadow: selected ? theme.shadowChunky : theme.shadowPress,
                      fontWeight: 400,
                      fontFamily: theme.fontBody,
                      borderRadius: theme.borderRadiusSm,
                      transition: `all 0.18s ${theme.easeSpring}`,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{opt.label}</div>
                      {opt.description && (
                        <div
                          style={{
                            fontSize: 11,
                            color: theme.textSecondary,
                            marginTop: 2,
                            lineHeight: 1.4,
                          }}
                        >
                          {opt.description}
                        </div>
                      )}
                    </div>
                  </Button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Submit button */}
        {canRespond && allAnswered && (
          <Button
            variant="primary"
            onClick={handleSubmit}
            style={{
              marginTop: 14,
              fontSize: 12,
              width: "100%",
            }}
          >
            Send Answer
          </Button>
        )}

        {/* Auto-answered hint */}
        {!canRespond && Object.keys(answered).length === 0 && (
          <div
            style={{
              fontSize: 11,
              color: theme.textMuted,
              marginTop: 10,
              fontStyle: "italic",
              fontFamily: theme.fontBody,
            }}
          >
            Auto-answered (agent was in bypass mode). You can override by sending a follow-up message.
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Plan Review — gold-themed card
// ---------------------------------------------------------------------------

function PlanView({ block, agentId }: { block: ToolUseBlock; agentId: string }) {
  const input = block.input as Record<string, unknown>;
  const plan = (input.plan as string) || "";
  const sendPrompt = useAgentStore((s) => s.sendPrompt);
  const agentStatus = useAgentStore((s) => s.agents[agentId]?.status);
  const theme = useThemeStore((s) => s.current);
  const [sent, setSent] = useState(false);
  const canRespond = agentStatus === "awaiting_input" && !sent;

  const handleApprove = async () => {
    setSent(true);
    await sendPrompt(agentId, "Plan approved. Proceed with implementation.");
  };

  const handleReject = async () => {
    setSent(true);
    await sendPrompt(agentId, "Plan rejected. Please revise the plan based on my feedback.");
  };

  return (
    <div
      style={{
        borderRadius: theme.borderRadius,
        background: theme.goldLight,
        border: `2px solid ${theme.gold}`,
        boxShadow: theme.shadowChunky,
        overflow: "hidden",
      }}
    >
      {/* Header bar */}
      <div
        style={{
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          borderBottom: `1px solid ${theme.borderColor}`,
        }}
      >
        <FileText size={15} color={theme.gold} strokeWidth={2.5} />
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: theme.textPrimary,
            fontFamily: theme.fontHeading,
            letterSpacing: "0.01em",
          }}
        >
          Plan ready for review
        </span>
        <span style={{ fontSize: 13 }}>&#128203;</span>
      </div>

      {/* Plan content */}
      <div style={{ padding: "14px 16px" }}>
        {plan && (
          <div
            style={{
              maxHeight: 320,
              overflow: "auto",
              marginBottom: canRespond ? 14 : 0,
            }}
          >
            <MarkdownRenderer content={plan} />
          </div>
        )}

        {/* Action buttons */}
        {canRespond && (
          <div style={{ display: "flex", gap: 10 }}>
            <Button
              variant="primary"
              color={theme.mint}
              onClick={handleApprove}
              style={{ fontSize: 12, flex: 1 }}
              icon={<CheckCircle size={13} />}
            >
              Approve Plan
            </Button>
            <Button
              variant="secondary"
              onClick={handleReject}
              style={{ fontSize: 12, flex: 1 }}
            >
              Request Changes
            </Button>
          </div>
        )}

        {sent && (
          <div
            style={{
              fontSize: 11,
              color: theme.textMuted,
              marginTop: 10,
              fontStyle: "italic",
              fontFamily: theme.fontBody,
            }}
          >
            Response sent
          </div>
        )}
      </div>
    </div>
  );
}
