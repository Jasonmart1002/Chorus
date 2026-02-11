import { useState } from "react";
import { Cpu, RotateCw, Folder, Play, Loader, GitBranch, ChevronDown, TerminalSquare } from "lucide-react";
import type { Agent } from "../../types/agent";
import { STATUS_COLORS, STATUS_LABELS } from "../../lib/constants";
import { useAgentStore } from "../../store/agentStore";
import { useSidebarStore } from "../../store/sidebarStore";
import { useThemeStore } from "../../store/themeStore";
import { getDisplayName } from "../../lib/sortAgents";
import { RunDialog } from "../RunDialog";
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
  const statusColor = STATUS_COLORS[agent.status] || theme.textMuted;
  const displayName = getDisplayName(agent, prefs);
  const [showRun, setShowRun] = useState(false);
  const [showGitMenu, setShowGitMenu] = useState(false);
  const [showTermMenu, setShowTermMenu] = useState(false);
  const commandState = useAgentStore((s) => s.commandStates[agent.config.cwd]);
  const sendPrompt = useAgentStore((s) => s.sendPrompt);
  const openTerminal = useAgentStore((s) => s.openTerminal);
  const openClaudeTerminal = useAgentStore((s) => s.openClaudeTerminal);
  const isRunning = commandState?.running === true;

  const canSend = agent.status === "awaiting_input" || agent.status === "idle";

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
          padding: "8px 20px",
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
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Badge variant="status" color={statusColor} />
          <span style={{ fontWeight: 600, color: theme.textPrimary, fontSize: 14 }}>
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

        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <DropdownMenu
            trigger={
              <IconButton
                icon={<><TerminalSquare size={11} /><span style={{ fontSize: 11, fontWeight: 600 }}>Terminal</span><ChevronDown size={9} /></>}
                tooltip="Open terminal"
                onClick={() => setShowTermMenu(!showTermMenu)}
                variant="tinted"
                tintColor={theme.textSecondary}
                size="md"
                style={{ width: "auto", padding: "4px 12px", gap: 4 }}
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
                icon={<><GitBranch size={11} /><span style={{ fontSize: 11, fontWeight: 600 }}>Git</span><ChevronDown size={9} /></>}
                tooltip="Git actions"
                onClick={() => setShowGitMenu(!showGitMenu)}
                variant="tinted"
                tintColor={theme.peach}
                disabled={!canSend}
                size="md"
                style={{ width: "auto", padding: "4px 12px", gap: 4 }}
              />
            }
            open={showGitMenu}
            onOpenChange={setShowGitMenu}
            align="end"
          >
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
                <><Loader size={11} style={{ animation: "spin 1s linear infinite" }} /><span style={{ fontSize: 11, fontWeight: 600 }}>Running</span></>
              ) : (
                <><Play size={11} /><span style={{ fontSize: 11, fontWeight: 600 }}>Run</span></>
              )
            }
            tooltip="Run command"
            onClick={() => setShowRun(true)}
            variant="tinted"
            tintColor={isRunning ? theme.lavender : theme.mint}
            size="md"
            style={{ width: "auto", padding: "4px 12px", gap: 4 }}
          />
        </div>
      </div>

      {showRun && <RunDialog cwd={agent.config.cwd} onClose={() => setShowRun(false)} />}
    </>
  );
}
