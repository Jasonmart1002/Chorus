import { useState } from "react";
import { Terminal, Layers, Zap } from "lucide-react";
import { useThemeStore } from "../store/themeStore";
import { Dialog } from "./ui/Dialog";

interface Props {
  onClose: () => void;
  onNewAgent: () => void;
}

const STEPS = [
  {
    icon: Terminal,
    color: "pink" as const,
    title: "Powered by Claude Code",
    description:
      "Chorus wraps the Claude Code CLI, giving you a visual multi-agent dashboard. Make sure you have it installed:",
    code: "npm install -g @anthropic-ai/claude-code",
  },
  {
    icon: Layers,
    color: "sapphire" as const,
    title: "Run Multiple Agents",
    description:
      "Spawn agents in different project directories and watch them work side by side. Pin, rename, drag to reorder, and right-click for quick actions.",
  },
  {
    icon: Zap,
    color: "mint" as const,
    title: "Built-in Superpowers",
    description:
      "Edit CLAUDE.md files, manage MCP servers, configure hooks & skills, run shell commands, and track costs — all from one place.",
  },
];

export function OnboardingDialog({ onClose, onNewAgent }: Props) {
  const theme = useThemeStore((s) => s.current);
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      localStorage.setItem("chorus-onboarded", "1");
      onClose();
      onNewAgent();
    } else {
      setStep(step + 1);
    }
  };

  const handleSkip = () => {
    localStorage.setItem("chorus-onboarded", "1");
    onClose();
  };

  const btnBase: React.CSSProperties = {
    padding: "10px 24px",
    borderRadius: theme.borderRadiusSm,
    fontSize: 13,
    fontWeight: 700,
    fontFamily: theme.fontHeading,
    cursor: "pointer",
    border: "none",
    transition: "all 0.15s ease",
  };

  return (
    <Dialog
      open={true}
      onClose={handleSkip}
      title="Welcome to Chorus"
      width={440}
      footer={
        <>
          <button
            onClick={handleSkip}
            style={{
              ...btnBase,
              background: "transparent",
              color: theme.textMuted,
              border: `1.5px solid ${theme.borderColor}`,
            }}
          >
            Skip
          </button>
          <button
            onClick={handleNext}
            style={{
              ...btnBase,
              background: theme.accentGradient,
              color: theme.textOnAccent,
              boxShadow: theme.shadowChunky,
            }}
          >
            {isLast ? "Create Your First Agent" : "Next"}
          </button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, padding: "10px 0" }}>
        {/* Icon */}
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: theme.borderRadiusFull,
            background: `${theme[current.color]}20`,
            border: `2.5px solid ${theme[current.color]}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `0 0 20px ${theme[current.color]}22`,
          }}
        >
          <Icon size={28} color={theme[current.color]} strokeWidth={2} />
        </div>

        {/* Title */}
        <h3
          style={{
            margin: 0,
            fontSize: 16,
            fontWeight: 800,
            fontFamily: theme.fontHeading,
            color: theme.textPrimary,
            textAlign: "center",
          }}
        >
          {current.title}
        </h3>

        {/* Description */}
        <p
          style={{
            margin: 0,
            fontSize: 13,
            fontFamily: theme.fontBody,
            color: theme.textSecondary,
            textAlign: "center",
            lineHeight: 1.6,
            maxWidth: 340,
          }}
        >
          {current.description}
        </p>

        {/* Code block (step 1 only) */}
        {current.code && (
          <code
            style={{
              display: "block",
              fontSize: 12,
              fontFamily: theme.fontCode,
              background: theme.bgBase,
              padding: "10px 16px",
              borderRadius: theme.borderRadiusSm,
              border: `1.5px solid ${theme.borderColor}`,
              color: theme.textPrimary,
              letterSpacing: "-0.01em",
              userSelect: "all",
            }}
          >
            {current.code}
          </code>
        )}

        {/* Step dots */}
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          {STEPS.map((_, i) => (
            <div
              key={i}
              onClick={() => setStep(i)}
              style={{
                width: i === step ? 20 : 8,
                height: 8,
                borderRadius: 4,
                background: i === step ? theme.pink : theme.borderColor,
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            />
          ))}
        </div>
      </div>
    </Dialog>
  );
}
