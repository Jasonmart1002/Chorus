import { useState, useRef, useEffect } from "react";
import { Send, ChevronDown } from "lucide-react";
import { useAgentStore } from "../../store/agentStore";
import { useThemeStore } from "../../store/themeStore";
import { IconButton } from "../ui/IconButton";
import { DropdownMenu, DropdownMenuItem } from "../ui/DropdownMenu";

type Mode = "normal" | "plan";

interface ModeConfig {
  id: Mode;
  label: string;
  getColor: (lavender: string, butter: string) => string;
  description: string;
}

const MODES: ModeConfig[] = [
  { id: "normal", label: "Normal", getColor: (lav) => lav, description: "Execute directly" },
  { id: "plan", label: "Plan", getColor: (_lav, butter) => butter, description: "Plan first, then implement" },
];

interface Props {
  agentId: string;
  disabled?: boolean;
}

export function PromptInput({ agentId, disabled }: Props) {
  const [text, setText] = useState("");
  const [mode, setMode] = useState<Mode>("normal");
  const [showModeMenu, setShowModeMenu] = useState(false);
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
  const currentColor = currentMode.getColor(theme.lavender, theme.butter);
  const canSend = !!(text.trim() && !disabled);

  return (
    <div
      style={{
        padding: "12px 20px 16px",
        borderTop: `1px solid ${theme.borderColor}`,
        background: theme.bgSurface,
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "flex-end",
          background: theme.bgBase,
          borderRadius: 8,
          padding: "8px 12px",
          border: `1px solid ${mode === "plan" ? theme.butter : theme.borderColor}`,
          transition: "border-color 0.15s",
        }}
      >
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? "Agent is not ready..." : "Send a prompt... (Cmd+Enter)"}
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
            fontFamily: "inherit",
            lineHeight: 1.5,
            maxHeight: 200,
          }}
        />
        <IconButton
          icon={<Send size={16} color={theme.textOnAccent} />}
          tooltip="Send prompt"
          onClick={handleSend}
          disabled={!canSend}
          size="md"
          style={{
            background: canSend ? currentColor : theme.borderColor,
            borderRadius: 8,
            opacity: canSend ? 1 : 0.5,
          }}
        />
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 8,
          fontSize: 11,
          color: theme.textMuted,
        }}
      >
        <DropdownMenu
          trigger={
            <button
              onClick={() => setShowModeMenu(!showModeMenu)}
              style={{
                background: "none",
                border: `1px solid ${theme.borderColor}`,
                borderRadius: 8,
                padding: "2px 8px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontSize: 11,
                color: currentColor,
                fontWeight: 600,
                fontFamily: theme.fontHeading,
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: currentColor,
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
            const mColor = m.getColor(theme.lavender, theme.butter);
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
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: mColor,
                      flexShrink: 0,
                    }}
                  />
                }
              >
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: theme.textPrimary }}>
                    {m.label}
                  </div>
                  <div style={{ fontSize: 10, color: theme.textMuted }}>{m.description}</div>
                </div>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenu>

        <span>
          Shift+Tab to switch mode &middot; Cmd+Enter to send
        </span>
      </div>
    </div>
  );
}
