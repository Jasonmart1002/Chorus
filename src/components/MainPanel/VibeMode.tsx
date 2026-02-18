import { useState, useEffect, useRef } from "react";
import { useAgentStore } from "../../store/agentStore";
import { useThemeStore } from "../../store/themeStore";
import { VibeModeHeader } from "./VibeModeHeader";
import { VibeWaiting } from "./VibeWaiting";
import { AgentView } from "./AgentView";

type TransitionPhase = "idle" | "slide-out" | "slide-in";
const SLIDE_OUT_MS = 200;
const SLIDE_IN_MS = 300;

export function VibeMode() {
  const vibeCurrentId = useAgentStore((s) => s.vibeCurrentId);
  const theme = useThemeStore((s) => s.current);

  // Track the displayed agent ID to allow transitions
  const [displayId, setDisplayId] = useState<string | null>(vibeCurrentId);
  const [phase, setPhase] = useState<TransitionPhase>("idle");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevIdRef = useRef<string | null>(vibeCurrentId);

  useEffect(() => {
    if (vibeCurrentId === prevIdRef.current) return;
    const hadPrev = prevIdRef.current !== null;
    prevIdRef.current = vibeCurrentId;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (hadPrev && displayId !== null) {
      // Slide out the old, then slide in the new
      setPhase("slide-out");
      timeoutRef.current = setTimeout(() => {
        setDisplayId(vibeCurrentId);
        setPhase("slide-in");
        timeoutRef.current = setTimeout(() => {
          setPhase("idle");
        }, SLIDE_IN_MS);
      }, SLIDE_OUT_MS);
    } else {
      // No old agent to slide out — just slide in
      setDisplayId(vibeCurrentId);
      setPhase("slide-in");
      timeoutRef.current = setTimeout(() => {
        setPhase("idle");
      }, SLIDE_IN_MS);
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [vibeCurrentId]); // eslint-disable-line react-hooks/exhaustive-deps

  const animationStyle: React.CSSProperties =
    phase === "slide-out"
      ? { animation: `vibeSlideOut ${SLIDE_OUT_MS}ms ease forwards` }
      : phase === "slide-in"
        ? { animation: `vibeSlideIn ${SLIDE_IN_MS}ms ${theme.easeSpring} forwards` }
        : {};

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <VibeModeHeader />
      <div
        key={displayId ?? "__waiting"}
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          ...animationStyle,
        }}
      >
        {displayId ? (
          <AgentView agentId={displayId} />
        ) : (
          <VibeWaiting />
        )}
      </div>
    </div>
  );
}
