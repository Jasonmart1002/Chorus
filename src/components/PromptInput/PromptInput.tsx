import { useState, useRef, useEffect } from "react";
import { Send, ChevronDown } from "lucide-react";
import { useAgentStore } from "../../store/agentStore";
import { useThemeStore } from "../../store/themeStore";
import { MOD_LABEL } from "../../lib/platform";
import { IconButton } from "../ui/IconButton";
import { DropdownMenu, DropdownMenuItem } from "../ui/DropdownMenu";

type Mode = "normal" | "plan";

interface ModeConfig {
  id: Mode;
  label: string;
  getColor: (pink: string, gold: string) => string;
  description: string;
}

const MODES: ModeConfig[] = [
  { id: "normal", label: "Normal", getColor: (pink) => pink, description: "Execute directly" },
  { id: "plan", label: "Plan", getColor: (_pink, gold) => gold, description: "Plan first, then implement" },
];

interface Props {
  agentId: string;
  disabled?: boolean;
}

export function PromptInput({ agentId, disabled }: Props) {
  const [text, setText] = useState("");
  const [mode, setMode] = useState<Mode>("normal");
  const [showModeMenu, setShowModeMenu] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const sendPrompt = useAgentStore((s) => s.sendPrompt);
  const theme = useThemeStore((s) => s.current);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [agentId]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;

    let prompt = trimmed;
    if (mode === "plan") {
      prompt = `Use plan mode: first create a thorough plan, present it for my approval, then implement only after I approve.\n\n${trimmed}`;
    }

    setText("");
    try {
      await sendPrompt(agentId, prompt);
    } catch (err) {
      console.error("Failed to send prompt:", err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
      return;
    }
    if (e.key === "Tab" && e.shiftKey) {
      e.preventDefault();
      const currentIdx = MODES.findIndex((m) => m.id === mode);
      const nextIdx = (currentIdx + 1) % MODES.length;
      setMode(MODES[nextIdx].id);
    }
  };

  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 200) + "px";
    }
  }, [text]);

  const currentMode = MODES.find((m) => m.id === mode)!;
  const currentColor = currentMode.getColor(theme.pink, theme.gold);
  const canSend = !!(text.trim() && !disabled);

  const borderColor = isFocused ? theme.mauve : theme.borderStrong;

  return (
    <div
      style={{
        padding: "14px 20px 18px",
        background: theme.bgSurface,
        position: "relative",
      }}
    >
      {/* Top gradient accent line */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: theme.accentGradient,
        }}
      />

      {/* Textarea wrapper -- chunky cute container */}
      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
          background: theme.bgBase,
          borderRadius: theme.borderRadiusSm,
          padding: "10px 14px",
          border: `2px solid ${borderColor}`,
          transition: `border-color 0.2s ${theme.easeSpring}`,
        }}
      >
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={
            disabled
              ? "Waiting for agent..."
              : "What shall we work on?"
          }
          disabled={disabled}
          rows={1}
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            color: theme.textPrimary,
            fontSize: 14,
            resize: "none",
            fontFamily: theme.fontBody,
            lineHeight: 1.6,
            maxHeight: 200,
          }}
        />

        {/* Send button -- chunky cute circle */}
        <button
          onClick={handleSend}
          disabled={!canSend}
          title="Send prompt"
          style={{
            width: 36,
            height: 36,
            borderRadius: theme.borderRadiusSm,
            background: canSend ? theme.accentGradient : theme.borderColor,
            border: canSend ? `2px solid ${theme.borderStrong}` : `2px solid transparent`,
            boxShadow: canSend ? theme.shadowChunky : "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: canSend ? "pointer" : "default",
            opacity: canSend ? 1 : 0.45,
            transition: `all 0.2s ${theme.easeSpring}`,
            flexShrink: 0,
            padding: 0,
          }}
        >
          <Send size={16} color={canSend ? theme.textOnAccent : theme.textMuted} />
        </button>
      </div>

      {/* Bottom row: mode toggle + hint text */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 10,
          fontSize: 11,
          color: theme.textMuted,
        }}
      >
        {/* Mode toggle -- cute pill */}
        <DropdownMenu
          trigger={
            <button
              onClick={() => setShowModeMenu(!showModeMenu)}
              style={{
                background: theme.bgCard,
                border: `2px solid ${theme.borderStrong}`,
                borderRadius: theme.borderRadiusSm,
                padding: "4px 12px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 11,
                color: currentColor,
                fontWeight: 700,
                fontFamily: theme.fontHeading,
                boxShadow: theme.shadowPress,
                transition: `all 0.15s ${theme.easeSpring}`,
              }}
            >
              <div
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: theme.borderRadiusFull,
                  background: currentColor,
                  border: "2px solid white",
                  boxShadow: `0 0 0 1px ${currentColor}`,
                  flexShrink: 0,
                }}
              />
              {currentMode.label}
              <ChevronDown size={10} />
            </button>
          }
          open={showModeMenu}
          onOpenChange={setShowModeMenu}
          align="start"
          side="top"
        >
          {MODES.map((m) => {
            const mColor = m.getColor(theme.pink, theme.gold);
            return (
              <DropdownMenuItem
                key={m.id}
                onClick={() => {
                  setMode(m.id);
                  setShowModeMenu(false);
                }}
                active={mode === m.id}
                icon={
                  <div
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: theme.borderRadiusFull,
                      background: mColor,
                      border: "2px solid white",
                      boxShadow: `0 0 0 1px ${mColor}`,
                      flexShrink: 0,
                    }}
                  />
                }
              >
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: theme.textPrimary, fontFamily: theme.fontHeading }}>
                    {m.label}
                  </div>
                  <div style={{ fontSize: 10, color: theme.textMuted, fontFamily: theme.fontBody }}>{m.description}</div>
                </div>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenu>

        <span
          style={{
            fontStyle: "italic",
            fontFamily: theme.fontBody,
            opacity: 0.7,
          }}
        >
          Shift+Tab to switch mode &middot; {MOD_LABEL}+Enter to send
        </span>
      </div>
    </div>
  );
}
