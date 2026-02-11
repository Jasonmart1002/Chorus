import { useState, useRef, useEffect } from "react";
import { Cpu, RotateCw, Folder, Play, Loader, GitBranch, ChevronDown, TerminalSquare } from "lucide-react";
import type { Agent } from "../../types/agent";
import { STATUS_COLORS, STATUS_LABELS } from "../../lib/constants";
import { useAgentStore } from "../../store/agentStore";
import { useSidebarStore } from "../../store/sidebarStore";
import { useThemeStore } from "../../store/themeStore";
import { getDisplayName } from "../../lib/sortAgents";
import { RunDialog } from "../RunDialog";

const GIT_ACTIONS = [
  {
    label: "Commit changes",
    prompt: "Review all current changes with `git diff` and `git status`, then create a well-structured commit with a descriptive message. Stage only relevant files.",
  },
  {
    label: "Create PR",
    prompt: "Review all commits on the current branch vs main using `git log main..HEAD` and `git diff main...HEAD`. Then create a pull request with a clear title and summary using `gh pr create`.",
  },
  {
    label: "Push to main",
    prompt: "Check the current branch and status. If on main, push directly. If on a feature branch, merge to main first then push. Show me the commands before running them.",
  },
  {
    label: "Stash changes",
    prompt: "Stash all current changes with a descriptive message using `git stash push -m \"description\"`.",
  },
  {
    label: "Show status",
    prompt: "Run `git status` and `git log --oneline -10` and summarize the current state of the repo — branch, uncommitted changes, recent commits.",
  },
];

interface Props {
  agent: Agent;
}

export function ContextSummary({ agent }: Props) {
  const statusColor = STATUS_COLORS[agent.status] || "#B8B8B8";
  const prefs = useSidebarStore((s) => s.getPrefs(agent.id));
  const theme = useThemeStore((s) => s.current);
  const displayName = getDisplayName(agent, prefs);
  const [showRun, setShowRun] = useState(false);
  const [showGitMenu, setShowGitMenu] = useState(false);
  const commandState = useAgentStore((s) => s.commandStates[agent.config.cwd]);
  const sendPrompt = useAgentStore((s) => s.sendPrompt);
  const openTerminal = useAgentStore((s) => s.openTerminal);
  const openClaudeTerminal = useAgentStore((s) => s.openClaudeTerminal);
  const isRunning = commandState?.running === true;
  const gitMenuRef = useRef<HTMLDivElement>(null);

  const canSend = agent.status === "awaiting_input" || agent.status === "idle";

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (gitMenuRef.current && !gitMenuRef.current.contains(e.target as Node)) {
        setShowGitMenu(false);
      }
    };
    if (showGitMenu) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showGitMenu]);

  const handleGitAction = async (prompt: string) => {
    setShowGitMenu(false);
    if (!canSend) return;
    try {
      await sendPrompt(agent.id, prompt);
    } catch (err) {
      console.error("Failed to send git action:", err);
    }
  };

  return (
    <>
      <div
        style={{
          padding: "10px 20px",
          borderBottom: `1px solid ${theme.borderColor}`,
          display: "flex",
          alignItems: "center",
          gap: 16,
          background: theme.bgSurface,
          fontSize: 12,
          color: theme.textSecondary,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: statusColor,
            }}
          />
          <span style={{ fontWeight: 600, color: theme.textPrimary, fontSize: 14, fontFamily: theme.fontHeading }}>
            {displayName}
          </span>
          <span style={{ color: theme.textMuted }}>&middot;</span>
          <span>{STATUS_LABELS[agent.status]}</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <Folder size={12} />
          <span style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {agent.config.cwd}
          </span>
        </div>

        {agent.num_turns > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <RotateCw size={12} />
            <span>{agent.num_turns} turns</span>
          </div>
        )}

        {agent.config.model && (
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Cpu size={12} />
            <span>{agent.config.model}</span>
          </div>
        )}

        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <HeaderBtn
            onClick={() => openTerminal(agent.config.cwd)}
            title="Open terminal at project directory"
            color={theme.textSecondary}
            bgBase="rgba(180, 180, 180, 0.1)"
            bgHover="rgba(180, 180, 180, 0.2)"
            theme={theme}
          >
            <TerminalSquare size={11} />
            Terminal
          </HeaderBtn>

          <HeaderBtn
            onClick={() => openClaudeTerminal(agent.config.cwd, agent.session_id)}
            title="Open Claude Code CLI with this session"
            color="#C8A951"
            bgBase={`${theme.butter}33`}
            bgHover={`${theme.butter}55`}
            theme={theme}
          >
            <TerminalSquare size={11} />
            Claude CLI
          </HeaderBtn>

          <div style={{ position: "relative" }} ref={gitMenuRef}>
            <HeaderBtn
              onClick={() => setShowGitMenu(!showGitMenu)}
              title="Git actions"
              color={theme.peach}
              bgBase={`${theme.peach}22`}
              bgHover={`${theme.peach}44`}
              disabled={!canSend}
              theme={theme}
            >
              <GitBranch size={11} />
              Git
              <ChevronDown size={9} />
            </HeaderBtn>

            {showGitMenu && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  right: 0,
                  marginTop: 4,
                  background: theme.bgCard,
                  border: `1px solid ${theme.borderColor}`,
                  borderRadius: 8,
                  padding: 4,
                  minWidth: 200,
                  boxShadow: theme.shadowDialog,
                  zIndex: 50,
                }}
              >
                {GIT_ACTIONS.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => handleGitAction(action.prompt)}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      background: "transparent",
                      border: "none",
                      borderRadius: 5,
                      cursor: "pointer",
                      textAlign: "left",
                      fontSize: 12,
                      color: theme.textPrimary,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = theme.lavenderLight)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <HeaderBtn
            onClick={() => setShowRun(true)}
            title="Run command"
            color={isRunning ? theme.lavender : theme.mint}
            bgBase={isRunning ? `${theme.lavender}22` : `${theme.mint}22`}
            bgHover={isRunning ? `${theme.lavender}44` : `${theme.mint}44`}
            theme={theme}
          >
            {isRunning ? (
              <>
                <Loader size={11} style={{ animation: "spin 1s linear infinite" }} />
                Running
              </>
            ) : (
              <>
                <Play size={11} />
                Run
              </>
            )}
          </HeaderBtn>
        </div>
      </div>

      {showRun && <RunDialog cwd={agent.config.cwd} onClose={() => setShowRun(false)} />}
    </>
  );
}

function HeaderBtn({
  children,
  onClick,
  title,
  color,
  bgBase,
  bgHover,
  disabled,
  theme,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  color: string;
  bgBase: string;
  bgHover: string;
  disabled?: boolean;
  theme: import("../../lib/theme").ThemeColors;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      style={{
        padding: "4px 10px",
        background: bgBase,
        border: `1px solid ${color}33`,
        borderRadius: 6,
        color: disabled ? theme.textMuted : color,
        cursor: disabled ? "not-allowed" : "pointer",
        fontSize: 11,
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
        gap: 4,
        opacity: disabled ? 0.5 : 1,
      }}
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.background = bgHover;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = bgBase;
      }}
    >
      {children}
    </button>
  );
}
