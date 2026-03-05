import { useAgentStore } from "../../store/agentStore";
import { useThemeStore } from "../../store/themeStore";
import { MOD_LABEL } from "../../lib/platform";
import { AgentView } from "./AgentView";
import { VibeMode } from "./VibeMode";
import { SkillsView } from "./SkillsView";
import { AutomationsView } from "./AutomationsView";
import { McpView } from "./McpView";
import { HooksView } from "./HooksView";
import { Bot } from "lucide-react";

export function MainPanel() {
  const selectedAgentId = useAgentStore((s) => s.selectedAgentId);
  const vibeMode = useAgentStore((s) => s.vibeMode);
  const viewMode = useAgentStore((s) => s.viewMode);
  const theme = useThemeStore((s) => s.current);

  if (vibeMode) {
    return (
      <div style={{ flex: 1, height: "100%", minWidth: 0, overflow: "hidden" }}>
        <VibeMode />
      </div>
    );
  }

  if (viewMode === "skills") {
    return (
      <div style={{ flex: 1, height: "100%", minWidth: 0, overflow: "hidden" }}>
        <SkillsView />
      </div>
    );
  }

  if (viewMode === "automations") {
    return (
      <div style={{ flex: 1, height: "100%", minWidth: 0, overflow: "hidden" }}>
        <AutomationsView />
      </div>
    );
  }

  if (viewMode === "mcp") {
    return (
      <div style={{ flex: 1, height: "100%", minWidth: 0, overflow: "hidden" }}>
        <McpView />
      </div>
    );
  }

  if (viewMode === "hooks") {
    return (
      <div style={{ flex: 1, height: "100%", minWidth: 0, overflow: "hidden" }}>
        <HooksView />
      </div>
    );
  }

  if (!selectedAgentId) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
          backgroundImage: theme.dotPattern,
          backgroundSize: "24px 24px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Warm glow behind the icon */}
        <div
          style={{
            position: "absolute",
            width: 200,
            height: 200,
            borderRadius: theme.borderRadiusFull,
            background: theme.warmGradient,
            opacity: 0.15,
            filter: "blur(60px)",
            pointerEvents: "none",
          }}
        />

        {/* Cute chunky icon container */}
        <div
          style={{
            position: "relative",
            width: 80,
            height: 80,
            borderRadius: theme.borderRadiusXl,
            background: theme.mauveLight,
            border: `3px solid ${theme.borderStrong}`,
            boxShadow: theme.shadowChunky,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Bot
            size={40}
            strokeWidth={2}
            color={theme.mauve}
          />
        </div>

        {/* Heading */}
        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            fontFamily: theme.fontHeading,
            color: theme.textPrimary,
            textShadow: `2px 2px 0px ${theme.mauveLight}`,
            letterSpacing: "-0.02em",
          }}
        >
          No agent selected
        </div>

        {/* Cute subtext */}
        <div
          style={{
            fontSize: 14,
            fontFamily: theme.fontBody,
            color: theme.textSecondary,
            textAlign: "center",
            lineHeight: 1.6,
            maxWidth: 320,
          }}
        >
          Pick an agent from the sidebar, or create a new one ~
        </div>

        {/* Chunky kbd pill */}
        <kbd
          style={{
            marginTop: 4,
            padding: "6px 16px",
            background: theme.bgCard,
            borderRadius: theme.borderRadiusSm,
            fontSize: 13,
            fontWeight: 600,
            color: theme.textSecondary,
            border: `2px solid ${theme.borderStrong}`,
            boxShadow: theme.shadowChunky,
            fontFamily: theme.fontCode,
            letterSpacing: "0.04em",
            transition: `all 0.2s ${theme.easeSpring}`,
            cursor: "default",
          }}
        >
          {MOD_LABEL}+N
        </kbd>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, height: "100%", minWidth: 0, overflow: "hidden" }}>
      <AgentView agentId={selectedAgentId} />
    </div>
  );
}
