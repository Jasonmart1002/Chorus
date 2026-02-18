import { useState, useEffect } from "react";
import { Cpu, RotateCw, Folder, Play, Loader, GitBranch, ChevronDown, TerminalSquare } from "lucide-react";
import type { Agent } from "../../types/agent";
import { getStatusColors, STATUS_LABELS } from "../../lib/constants";
import { useAgentStore } from "../../store/agentStore";
import { useSidebarStore } from "../../store/sidebarStore";
import { useThemeStore } from "../../store/themeStore";
import { getDisplayName } from "../../lib/sortAgents";
import { RunDialog } from "../RunDialog";
import { DiffDialog } from "../DiffDialog";
import { IconButton } from "../ui/IconButton";
import { Badge } from "../ui/Badge";
import { DropdownMenu, DropdownMenuItem } from "../ui/DropdownMenu";

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
  const prefs = useSidebarStore((s) => s.getPrefs(agent.id));
  const theme = useThemeStore((s) => s.current);
  const statusColor = getStatusColors(theme)[agent.status] || theme.textMuted;
  const displayName = getDisplayName(agent, prefs);
  const [showRun, setShowRun] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [showGitMenu, setShowGitMenu] = useState(false);
  const [showTermMenu, setShowTermMenu] = useState(false);
  const commandState = useAgentStore((s) => s.commandStates[agent.config.cwd]);
  const sendPrompt = useAgentStore((s) => s.sendPrompt);
  const openTerminal = useAgentStore((s) => s.openTerminal);
  const openClaudeTerminal = useAgentStore((s) => s.openClaudeTerminal);
  const pendingAction = useAgentStore((s) => s.pendingAction);
  const clearPendingAction = useAgentStore((s) => s.clearPendingAction);
  const isRunning = commandState?.running === true;

  const canSend = agent.status === "awaiting_input" || agent.status === "idle";

  // React to global keyboard shortcut actions
  useEffect(() => {
    if (!pendingAction) return;
    if (pendingAction === 'git') setShowGitMenu(true);
    else if (pendingAction === 'terminal') setShowTermMenu(true);
    else if (pendingAction === 'run') setShowRun(true);
    clearPendingAction();
  }, [pendingAction, clearPendingAction]);

  const handleGitAction = async (prompt: string) => {
    setShowGitMenu(false);
    if (!canSend) return;
    try {
      await sendPrompt(agent.id, prompt);
    } catch (err) {
      console.error("Failed to send git action:", err);
    }
  };

  /* Cute info pill style */
  const pillStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    padding: "3px 10px",
    background: theme.bgCard,
    border: `1.5px solid ${theme.borderColor}`,
    borderRadius: theme.borderRadiusSm,
    fontSize: 11,
    fontFamily: theme.fontBody,
    fontWeight: 600,
    color: theme.textSecondary,
    whiteSpace: "nowrap",
  };

  /* Chunky action button style */
  const actionBtnStyle = (tint: string): React.CSSProperties => ({
    width: "auto",
    padding: "4px 14px",
    gap: 5,
    borderRadius: theme.borderRadiusSm,
    border: `2px solid ${theme.borderStrong}`,
    boxShadow: theme.shadowChunky,
    background: tint + "18",
    transition: `all 0.15s ${theme.easeSpring}`,
  });

  return (
    <>
      <div
        style={{
          padding: "10px 20px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          background: theme.bgSidebar,
          backgroundImage: theme.dotPattern,
          backgroundSize: "20px 20px",
          fontSize: 12,
          color: theme.textSecondary,
          flexWrap: "wrap",
          position: "relative",
        }}
      >
        {/* Agent name + status */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Status badge with cute white ring */}
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: theme.borderRadiusFull,
              background: statusColor,
              border: "2.5px solid white",
              boxShadow: `0 0 0 1.5px ${statusColor}, ${theme.shadowPress}`,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontWeight: 700,
              color: theme.textPrimary,
              fontSize: 15,
              fontFamily: theme.fontHeading,
              letterSpacing: "-0.01em",
            }}
          >
            {displayName}
          </span>
          <span style={pillStyle}>
            {STATUS_LABELS[agent.status]}
          </span>
        </div>

        {/* Info pills */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span style={pillStyle}>
            <Folder size={11} color={theme.peach} />
            <span style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis" }}>
              {agent.config.cwd}
            </span>
          </span>

          {agent.num_turns > 0 && (
            <span style={pillStyle}>
              <RotateCw size={11} color={theme.mint} />
              {agent.num_turns} turns
            </span>
          )}

          {agent.config.model && (
            <span style={pillStyle}>
              <Cpu size={11} color={theme.lavender} />
              {agent.config.model}
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <DropdownMenu
            trigger={
              <IconButton
                icon={
                  <>
                    <TerminalSquare size={12} />
                    <span style={{ fontSize: 11, fontWeight: 700, fontFamily: theme.fontHeading }}>Terminal</span>
                    <ChevronDown size={9} />
                  </>
                }
                tooltip="Open terminal"
                onClick={() => setShowTermMenu(!showTermMenu)}
                variant="tinted"
                tintColor={theme.lavender}
                size="md"
                style={actionBtnStyle(theme.lavender)}
              />
            }
            open={showTermMenu}
            onOpenChange={setShowTermMenu}
            align="end"
          >
            <DropdownMenuItem
              onClick={() => { setShowTermMenu(false); openTerminal(agent.config.cwd); }}
              icon={<TerminalSquare size={12} />}
            >
              Open Terminal
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => { setShowTermMenu(false); openClaudeTerminal(agent.config.cwd, agent.session_id); }}
              icon={<TerminalSquare size={12} />}
            >
              Open Claude CLI
            </DropdownMenuItem>
          </DropdownMenu>

          <DropdownMenu
            trigger={
              <IconButton
                icon={
                  <>
                    <GitBranch size={12} />
                    <span style={{ fontSize: 11, fontWeight: 700, fontFamily: theme.fontHeading }}>Git</span>
                    <ChevronDown size={9} />
                  </>
                }
                tooltip="Git actions"
                onClick={() => setShowGitMenu(!showGitMenu)}
                variant="tinted"
                tintColor={theme.peach}
                disabled={!canSend}
                size="md"
                style={actionBtnStyle(theme.peach)}
              />
            }
            open={showGitMenu}
            onOpenChange={setShowGitMenu}
            align="end"
          >
            <DropdownMenuItem
              onClick={() => { setShowGitMenu(false); setShowDiff(true); }}
            >
              View diff
            </DropdownMenuItem>
            {GIT_ACTIONS.map((action) => (
              <DropdownMenuItem
                key={action.label}
                onClick={() => handleGitAction(action.prompt)}
              >
                {action.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenu>

          <IconButton
            icon={
              isRunning ? (
                <>
                  <Loader size={12} style={{ animation: "spin 1s linear infinite" }} />
                  <span style={{ fontSize: 11, fontWeight: 700, fontFamily: theme.fontHeading }}>Running</span>
                </>
              ) : (
                <>
                  <Play size={12} />
                  <span style={{ fontSize: 11, fontWeight: 700, fontFamily: theme.fontHeading }}>Run</span>
                </>
              )
            }
            tooltip="Run command"
            onClick={() => setShowRun(true)}
            variant="tinted"
            tintColor={isRunning ? theme.pink : theme.mint}
            size="md"
            style={actionBtnStyle(isRunning ? theme.pink : theme.mint)}
          />
        </div>

        {/* Bottom gradient divider */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 2,
            background: theme.accentGradient,
            opacity: 0.6,
          }}
        />
      </div>

      {showRun && <RunDialog cwd={agent.config.cwd} onClose={() => setShowRun(false)} />}
      {showDiff && <DiffDialog cwd={agent.config.cwd} onClose={() => setShowDiff(false)} />}
    </>
  );
}
