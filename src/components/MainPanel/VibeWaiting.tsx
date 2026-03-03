import { useMemo } from "react";
import { useAgentStore } from "../../store/agentStore";
import { useSidebarStore } from "../../store/sidebarStore";
import { useThemeStore } from "../../store/themeStore";
import { PASTEL_KEYS } from "../../lib/theme";
import { getDisplayName } from "../../lib/sortAgents";
import type { Agent, AgentStatus } from "../../types/agent";

const EQUALIZER_COLORS_KEYS = ["pink", "mauve", "sapphire", "teal", "gold"] as const;

function statusLabel(status: AgentStatus): string {
  switch (status) {
    case "working": return "Working...";
    case "idle": return "Idle";
    case "awaiting_input": return "Needs input";
    case "errored": return "Errored";
    case "exited": return "Exited";
  }
}

function statusDotColor(status: AgentStatus, theme: ReturnType<typeof useThemeStore.getState>["current"]): string {
  switch (status) {
    case "working": return theme.statusWorking;
    case "idle": return theme.statusIdle;
    case "awaiting_input": return theme.statusReady;
    case "errored": return theme.statusError;
    case "exited": return theme.statusIdle;
  }
}

/** Calculate positions on a semicircular arc */
function arcPositions(count: number, centerX: number, centerY: number, radius: number) {
  if (count === 1) {
    return [{ x: centerX, y: centerY - radius * 0.6 }];
  }
  // Arc from -70deg to 70deg (140 degree spread, top-centered)
  const startAngle = -70 * (Math.PI / 180) - Math.PI / 2;
  const endAngle = 70 * (Math.PI / 180) - Math.PI / 2;
  const positions: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const angle = startAngle + t * (endAngle - startAngle);
    positions.push({
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
    });
  }
  return positions;
}

function Equalizer() {
  const theme = useThemeStore((s) => s.current);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        gap: 5,
        height: 32,
      }}
    >
      {EQUALIZER_COLORS_KEYS.map((key, i) => (
        <div
          key={key}
          style={{
            width: 4,
            height: 28,
            borderRadius: 2,
            background: theme[key],
            transformOrigin: "bottom",
            animation: `equalizerBounce ${0.8 + i * 0.15}s ease-in-out ${i * 0.12}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

interface PerformerNodeProps {
  agent: Agent;
  index: number;
  x: number;
  y: number;
  useGrid: boolean;
}

function PerformerNode({ agent, index, x, y, useGrid }: PerformerNodeProps) {
  const theme = useThemeStore((s) => s.current);
  const getPrefs = useSidebarStore((s) => s.getPrefs);
  const attentionSet = useAgentStore((s) => s.attentionSet);

  const pastelKey = PASTEL_KEYS[index % PASTEL_KEYS.length];
  const pastelColor = theme[pastelKey];
  const dotColor = statusDotColor(agent.status, theme);
  const label = statusLabel(agent.status);
  const name = getDisplayName(agent, getPrefs(agent.id));
  const isAwaiting = !!attentionSet[agent.id];
  const isWorking = agent.status === "working";
  const isErrored = agent.status === "errored";

  let animation = "";
  if (isAwaiting) animation = "vibeNodeHighlight 1.5s ease-in-out infinite";
  else if (isWorking) animation = "pulse 1.5s ease-in-out infinite";
  else if (isErrored) animation = "bounce 0.6s ease 1";

  const positionStyle: React.CSSProperties = useGrid
    ? { position: "relative" }
    : {
        position: "absolute",
        left: x - 55,
        top: y - 42,
      };

  return (
    <div
      style={{
        ...positionStyle,
        width: 110,
        height: 85,
        borderRadius: theme.borderRadiusSm,
        background: pastelColor,
        border: `2.5px solid ${theme.borderStrong}`,
        boxShadow: theme.shadowChunky,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        padding: "8px 6px",
        animation,
        transition: "transform 0.3s ease, opacity 0.3s ease",
      }}
    >
      {/* Status dot */}
      <div
        style={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: dotColor,
          boxShadow: isAwaiting
            ? `0 0 8px 2px ${dotColor}`
            : `0 0 4px 1px ${dotColor}44`,
          ...(isAwaiting
            ? { animation: "vibeGlow 1.5s ease-in-out infinite", "--glow-color": dotColor } as React.CSSProperties
            : {}),
        }}
      />

      {/* Agent name */}
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          fontFamily: theme.fontHeading,
          color: theme.textPrimary,
          textAlign: "center",
          lineHeight: 1.2,
          maxWidth: 96,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {name}
      </div>

      {/* Status label */}
      <div
        style={{
          fontSize: 9,
          fontWeight: 600,
          fontFamily: theme.fontBody,
          color: theme.textSecondary,
          textAlign: "center",
        }}
      >
        {label}
      </div>
    </div>
  );
}

export function VibeWaiting() {
  const agents = useAgentStore((s) => s.agents);
  const theme = useThemeStore((s) => s.current);

  const activeAgents = useMemo(
    () => Object.values(agents).filter((a) => a.status !== "exited"),
    [agents]
  );

  const count = activeAgents.length;
  const useGrid = count > 8;

  // Arc layout: center at 50%, 60% height, radius scales with count
  const containerWidth = 700;
  const containerHeight = 500;
  const centerX = containerWidth / 2;
  const centerY = containerHeight * 0.62;
  const radius = Math.min(200 + count * 12, 300);

  const positions = useMemo(
    () => (useGrid ? [] : arcPositions(count, centerX, centerY, radius)),
    [count, centerX, centerY, radius, useGrid]
  );

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundImage: theme.dotPattern,
        backgroundSize: "24px 24px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Soft glow circle */}
      <div
        style={{
          position: "absolute",
          width: 260,
          height: 260,
          borderRadius: theme.borderRadiusFull,
          background: theme.accentGradient,
          opacity: 0.12,
          filter: "blur(60px)",
          pointerEvents: "none",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 0,
        }}
      />

      {/* Center content */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
        }}
      >
        <div
          style={{
            fontSize: 20,
            fontWeight: 700,
            fontFamily: theme.fontHeading,
            color: theme.textSecondary,
            letterSpacing: "-0.02em",
          }}
        >
          All voices performing...
        </div>
        <Equalizer />
        {count === 0 && (
          <div
            style={{
              fontSize: 13,
              fontFamily: theme.fontBody,
              color: theme.textMuted,
              marginTop: 8,
            }}
          >
            No active agents — create one to get started
          </div>
        )}
      </div>

      {/* Performer nodes */}
      {count > 0 && !useGrid && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              position: "relative",
              width: containerWidth,
              height: containerHeight,
              margin: "0 auto",
              top: "50%",
              transform: "translateY(-50%)",
              pointerEvents: "auto",
            }}
          >
            {activeAgents.map((agent, i) => (
              <PerformerNode
                key={agent.id}
                agent={agent}
                index={i}
                x={positions[i]?.x ?? 0}
                y={positions[i]?.y ?? 0}
                useGrid={false}
              />
            ))}
          </div>
        </div>
      )}

      {/* Grid fallback for 8+ agents */}
      {count > 0 && useGrid && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            justifyContent: "center",
            maxWidth: 600,
            marginTop: 32,
            position: "relative",
            zIndex: 1,
          }}
        >
          {activeAgents.map((agent, i) => (
            <PerformerNode
              key={agent.id}
              agent={agent}
              index={i}
              x={0}
              y={0}
              useGrid={true}
            />
          ))}
        </div>
      )}
    </div>
  );
}
