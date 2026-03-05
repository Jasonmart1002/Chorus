import { X, Zap, SkipForward, Square, Archive } from "lucide-react";
import { useAgentStore } from "../../store/agentStore";
import { useSidebarStore } from "../../store/sidebarStore";
import { useThemeStore } from "../../store/themeStore";
import { IconButton } from "../ui/IconButton";

export function VibeModeHeader() {
  const agents = useAgentStore((s) => s.agents);
  const attentionSet = useAgentStore((s) => s.attentionSet);
  const setVibeMode = useAgentStore((s) => s.setVibeMode);
  const vibeSkip = useAgentStore((s) => s.vibeSkip);
  const stopAgent = useAgentStore((s) => s.stopAgent);
  const vibeCurrentId = useAgentStore((s) => s.vibeCurrentId);
  const toggleArchive = useSidebarStore((s) => s.toggleArchive);
  const theme = useThemeStore((s) => s.current);

  const allAgents = Object.values(agents);
  const totalCount = allAgents.length;
  const readyCount = Object.keys(attentionSet).length;

  const attentionIds = Object.keys(attentionSet);
  const currentPos = vibeCurrentId ? attentionIds.indexOf(vibeCurrentId) + 1 : 0;

  // Show skip only when there's more than one agent in queue
  const canSkip = vibeCurrentId && readyCount > 1;
  const currentAgent = vibeCurrentId ? agents[vibeCurrentId] : null;
  const isWorking = currentAgent?.status === "working";

  const handleStop = () => {
    if (vibeCurrentId) stopAgent(vibeCurrentId);
  };

  const handleArchive = () => {
    if (!vibeCurrentId) return;
    toggleArchive(vibeCurrentId);
    vibeSkip();
  };

  const headerButtonStyle: React.CSSProperties = {
    color: theme.textOnAccent,
    background: "rgba(255,255,255,0.15)",
    border: "2px solid rgba(255,255,255,0.25)",
    borderRadius: theme.borderRadiusSm,
    width: 26,
    height: 26,
    minWidth: 26,
    minHeight: 26,
  };

  return (
    <div
      style={{
        height: 40,
        minHeight: 40,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 14px",
        background: theme.accentGradient,
        borderBottom: `2.5px solid ${theme.borderStrong}`,
        position: "relative",
        zIndex: 10,
      }}
    >
      {/* Left: Zap icon + label */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Zap
          size={15}
          strokeWidth={2.5}
          color={theme.textOnAccent}
          fill={theme.textOnAccent}
        />
        <span
          style={{
            fontSize: 13,
            fontWeight: 800,
            fontFamily: theme.fontHeading,
            color: theme.textOnAccent,
            letterSpacing: "-0.02em",
          }}
        >
          Vibe Mode
        </span>
      </div>

      {/* Center: queue info */}
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          fontFamily: theme.fontBody,
          color: theme.textOnAccent,
          opacity: 0.85,
        }}
      >
        {readyCount > 0
          ? `Agent ${currentPos || "—"} of ${readyCount} ready (${totalCount} total)`
          : `${totalCount} agent${totalCount !== 1 ? "s" : ""} working`}
      </span>

      {/* Right: action buttons */}
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        {vibeCurrentId && isWorking && (
          <IconButton
            icon={<Square size={11} strokeWidth={2.5} />}
            tooltip="Stop agent"
            onClick={handleStop}
            style={headerButtonStyle}
          />
        )}
        {vibeCurrentId && (
          <IconButton
            icon={<Archive size={12} strokeWidth={2.5} />}
            tooltip="Archive agent"
            onClick={handleArchive}
            style={headerButtonStyle}
          />
        )}
        {canSkip && (
          <IconButton
            icon={<SkipForward size={13} strokeWidth={2.5} />}
            tooltip="Skip — move to back of queue"
            onClick={vibeSkip}
            style={headerButtonStyle}
          />
        )}
        <IconButton
          icon={<X size={14} strokeWidth={2.5} />}
          tooltip="Exit Vibe Mode"
          onClick={() => setVibeMode(false)}
          style={headerButtonStyle}
        />
      </div>
    </div>
  );
}
