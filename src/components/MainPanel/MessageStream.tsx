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
} from "lucide-react";
import type { SDKMessage, ContentBlock, ToolUseBlock } from "../../types/messages";
import { useAgentStore } from "../../store/agentStore";
import { useThemeStore } from "../../store/themeStore";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { MarkdownRenderer } from "../ui/MarkdownRenderer";

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

interface Props {
  messages: SDKMessage[];
  agentId: string;
}

function shouldHideMessage(msg: SDKMessage): boolean {
  const raw = msg as Record<string, unknown>;
  const type = raw.type as string;
  const subtype = raw.subtype as string | undefined;

  if (type === "user") return true;
  if (type === "system" && subtype?.startsWith("hook_")) return true;

  return false;
}

type RenderItem =
  | { kind: "text"; text: string }
  | { kind: "tool_use"; block: ToolUseBlock }
  | { kind: "tool_group"; name: string; blocks: ToolUseBlock[] }
  | { kind: "result"; message: SDKMessage }
  | { kind: "user_prompt"; text: string }
  | { kind: "system_init" }
  | { kind: "ask_user"; block: ToolUseBlock }
  | { kind: "plan"; block: ToolUseBlock };

function flattenMessages(messages: SDKMessage[]): RenderItem[] {
  const items: RenderItem[] = [];
  for (const msg of messages) {
    const raw = msg as Record<string, unknown>;
    const type = raw.type as string;
    const subtype = raw.subtype as string | undefined;

    switch (type) {
      case "user_prompt":
        items.push({ kind: "user_prompt", text: raw.text as string });
        break;
      case "system":
        if (subtype === "init") items.push({ kind: "system_init" });
        break;
      case "assistant": {
        const content = (raw.message as Record<string, unknown>)?.content as ContentBlock[] | undefined;
        if (content) {
          for (const block of content) {
            if (block.type === "text" && block.text.trim()) {
              items.push({ kind: "text", text: block.text });
            } else if (block.type === "tool_use") {
              const tb = block as ToolUseBlock;
              if (tb.name === "AskUserQuestion") {
                items.push({ kind: "ask_user", block: tb });
              } else if (tb.name === "ExitPlanMode") {
                items.push({ kind: "plan", block: tb });
              } else {
                items.push({ kind: "tool_use", block: tb });
              }
            }
          }
        }
        break;
      }
      case "result":
        items.push({ kind: "result", message: msg });
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
      let j = i + 1;
      while (
        j < items.length &&
        items[j].kind === "tool_use" &&
        (items[j] as { kind: "tool_use"; block: ToolUseBlock }).block.name === item.block.name
      ) {
        j++;
      }
      if (j - i >= 2) {
        result.push({
          kind: "tool_group",
          name: item.block.name,
          blocks: items.slice(i, j).map((it) => (it as { kind: "tool_use"; block: ToolUseBlock }).block),
        });
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

export function MessageStream({ messages, agentId }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const theme = useThemeStore((s) => s.current);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const visible = messages.filter((m) => !shouldHideMessage(m));

  if (visible.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: theme.textMuted,
          fontSize: 14,
        }}
      >
        Send a prompt to start the conversation
      </div>
    );
  }

  const flat = flattenMessages(visible);
  const grouped = groupConsecutiveToolItems(flat);

  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        padding: "16px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {grouped.map((item, i) => (
        <RenderItemView key={i} item={item} agentId={agentId} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}

function RenderItemView({ item, agentId }: { item: RenderItem; agentId: string }) {
  const theme = useThemeStore((s) => s.current);

  switch (item.kind) {
    case "user_prompt":
      return (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <div
            style={{
              maxWidth: "80%",
              padding: "8px 12px",
              borderRadius: "12px 12px 2px 12px",
              background: theme.lavenderLight,
              border: `1px solid ${theme.lavender}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
              <User size={10} color={theme.lavender} />
              <span style={{ fontSize: 10, color: theme.lavender, fontWeight: 600 }}>You</span>
            </div>
            <div
              style={{
                fontSize: 13,
                color: theme.textPrimary,
                lineHeight: 1.5,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {item.text}
            </div>
          </div>
        </div>
      );

    case "system_init":
      return (
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: theme.textMuted, fontSize: 12 }}>
          <Terminal size={12} />
          <span>Session initialized</span>
        </div>
      );

    case "text":
      return <MarkdownRenderer content={item.text} />;

    case "tool_use":
      return <ToolUseView block={item.block} />;

    case "tool_group":
      return <ToolGroupView name={item.name} blocks={item.blocks} />;

    case "ask_user":
      return <AskUserQuestionView block={item.block} agentId={agentId} />;

    case "plan":
      return <PlanView block={item.block} agentId={agentId} />;

    case "result": {
      const raw = item.message as Record<string, unknown>;
      const subtype = raw.subtype as string | undefined;
      const isError = subtype !== "success";
      const numTurns = raw.num_turns as number | undefined;
      return (
        <div
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            background: isError ? theme.peachLight : theme.mintLight,
            border: `1px solid ${isError ? theme.peach : theme.mint}`,
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 11,
            color: theme.textSecondary,
          }}
        >
          {isError ? (
            <AlertCircle size={12} color={theme.peach} style={{ flexShrink: 0 }} />
          ) : (
            <CheckCircle size={12} color={theme.mint} style={{ flexShrink: 0 }} />
          )}
          {isError && (
            <span style={{ color: theme.textPrimary, fontSize: 12 }}>
              {(raw.result as string || "").substring(0, 200)}
            </span>
          )}
          <span style={{ color: theme.textSecondary }}>
            {isError ? "Error" : "Turn complete"}
          </span>
          {numTurns != null && numTurns > 0 && (
            <span>&middot; {numTurns} turns</span>
          )}
        </div>
      );
    }

    default:
      return null;
  }
}

// --- AskUserQuestion interactive renderer ---

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
        padding: "12px 16px",
        borderRadius: 8,
        background: theme.lavenderLight,
        border: `1px solid ${theme.lavender}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <HelpCircle size={14} color={theme.lavender} />
        <span style={{ fontSize: 12, fontWeight: 600, color: theme.textPrimary, fontFamily: theme.fontHeading }}>
          Question from Claude
        </span>
      </div>

      {questions.map((q, qIdx) => (
        <div key={qIdx} style={{ marginBottom: qIdx < questions.length - 1 ? 12 : 0 }}>
          {q.header && (
            <div style={{ fontSize: 10, fontWeight: 600, color: theme.textMuted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
              {q.header}
            </div>
          )}
          <div style={{ fontSize: 13, color: theme.textPrimary, marginBottom: 8 }}>
            {q.question}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
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
                    padding: "8px 12px",
                    background: selected ? theme.lavenderLight : theme.bgCard,
                    border: selected ? `1px solid ${theme.lavender}` : `1px solid ${theme.borderColor}`,
                    color: theme.textPrimary,
                    boxShadow: "none",
                    fontWeight: 400,
                    fontFamily: "inherit",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 500 }}>{opt.label}</div>
                    {opt.description && (
                      <div style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }}>{opt.description}</div>
                    )}
                  </div>
                </Button>
              );
            })}
          </div>
        </div>
      ))}

      {canRespond && allAnswered && (
        <Button
          variant="primary"
          onClick={handleSubmit}
          style={{ marginTop: 12, fontSize: 12 }}
        >
          Send Answer
        </Button>
      )}

      {!canRespond && Object.keys(answered).length === 0 && (
        <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 8, fontStyle: "italic" }}>
          Auto-answered (agent was in bypass mode). You can override by sending a follow-up message.
        </div>
      )}
    </div>
  );
}

// --- Plan renderer ---

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
        padding: "12px 16px",
        borderRadius: 8,
        background: theme.mintLight,
        border: `1px solid ${theme.mint}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <FileText size={14} color={theme.mint} />
        <span style={{ fontSize: 12, fontWeight: 600, color: theme.textPrimary, fontFamily: theme.fontHeading }}>
          Plan Ready for Review
        </span>
      </div>
      {plan && (
        <div
          style={{
            maxHeight: 300,
            overflow: "auto",
            marginBottom: canRespond ? 12 : 0,
          }}
        >
          <MarkdownRenderer content={plan} />
        </div>
      )}
      {canRespond && (
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="primary" color={theme.mint} onClick={handleApprove} style={{ fontSize: 12 }}>
            Approve Plan
          </Button>
          <Button variant="secondary" onClick={handleReject} style={{ fontSize: 12 }}>
            Request Changes
          </Button>
        </div>
      )}
      {sent && (
        <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 8, fontStyle: "italic" }}>
          Response sent
        </div>
      )}
    </div>
  );
}


// --- Compact tool use renderer ---

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

function ToolGroupView({ name, blocks }: { name: string; blocks: ToolUseBlock[] }) {
  const [expanded, setExpanded] = useState(false);
  const theme = useThemeStore((s) => s.current);
  const summaryFn = TOOL_SUMMARIES[name];
  const Icon = TOOL_ICONS[name] || Wrench;

  const summaries = blocks
    .map((b) => {
      const input = b.input as Record<string, unknown>;
      return summaryFn ? summaryFn(input) : "";
    })
    .filter(Boolean);

  const preview =
    summaries.length <= 2
      ? summaries.join(", ")
      : `${summaries[0]}, ${summaries[1]}, +${summaries.length - 2}`;

  return (
    <div
      style={{
        borderRadius: 8,
        background: theme.lavenderLight,
        border: `1px solid ${theme.lavender}40`,
        overflow: "hidden",
      }}
    >
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: "8px 12px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        {expanded ? (
          <ChevronDown size={12} color={theme.textMuted} />
        ) : (
          <ChevronRight size={12} color={theme.textMuted} />
        )}
        <Icon size={11} color={theme.lavender} />
        <span style={{ fontSize: 12, fontWeight: 600, color: theme.textPrimary }}>{name}</span>
        <Badge variant="count" color={theme.lavender}>
          &times;{blocks.length}
        </Badge>
        {!expanded && preview && (
          <span
            style={{
              fontSize: 11,
              color: theme.textMuted,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flex: 1,
            }}
          >
            {preview}
          </span>
        )}
      </div>
      {expanded && (
        <div
          style={{
            borderTop: `1px solid ${theme.lavender}30`,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {blocks.map((b, i) => (
            <ToolUseView key={i} block={b} />
          ))}
        </div>
      )}
    </div>
  );
}

function ToolUseView({ block }: { block: ToolUseBlock }) {
  const [expanded, setExpanded] = useState(false);
  const theme = useThemeStore((s) => s.current);
  const input = block.input as Record<string, unknown>;
  const summaryFn = TOOL_SUMMARIES[block.name];
  const summary = summaryFn ? summaryFn(input) : "";
  const Icon = TOOL_ICONS[block.name] || Wrench;

  return (
    <div
      style={{
        borderRadius: 8,
        background: theme.lavenderLight,
        border: `1px solid ${theme.lavender}40`,
        overflow: "hidden",
      }}
    >
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: "8px 12px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        {expanded ? (
          <ChevronDown size={12} color={theme.textMuted} />
        ) : (
          <ChevronRight size={12} color={theme.textMuted} />
        )}
        <Icon size={11} color={theme.lavender} />
        <span style={{ fontSize: 12, fontWeight: 600, color: theme.textPrimary }}>{block.name}</span>
        {summary && (
          <span
            style={{
              fontSize: 11,
              color: theme.textMuted,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flex: 1,
            }}
          >
            {summary}
          </span>
        )}
      </div>
      {expanded && (
        <div
          style={{
            padding: "8px 12px",
            borderTop: `1px solid ${theme.lavender}30`,
            fontSize: 11,
            color: theme.textSecondary,
            fontFamily: theme.fontCode,
            maxHeight: 200,
            overflow: "auto",
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
          }}
        >
          {JSON.stringify(input, null, 2)}
        </div>
      )}
    </div>
  );
}
