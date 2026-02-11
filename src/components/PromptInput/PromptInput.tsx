import { useState, useRef, useEffect } from "react";
import { Send, ChevronDown } from "lucide-react";
import { useAgentStore } from "../../store/agentStore";
import { useThemeStore } from "../../store/themeStore";

type Mode = "normal" | "plan";

interface ModeConfig {
  id: Mode;
  label: string;
  getColor: (lavender: string) => string;
  description: string;
}

const MODES: ModeConfig[] = [
  { id: "normal", label: "Normal", getColor: (lav) => lav, description: "Execute directly" },
  { id: "plan", label: "Plan", getColor: () => "#C8A951", description: "Plan first, then implement" },
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
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [agentId]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowModeMenu(false);
      }
    };
    if (showModeMenu) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showModeMenu]);

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
  const currentColor = currentMode.getColor(theme.lavender);

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
          borderRadius: 10,
          padding: "8px 12px",
          border: `1px solid ${mode === "plan" ? `${theme.butter}` : theme.borderColor}`,
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
        <button
          onClick={handleSend}
          disabled={!text.trim() || disabled}
          style={{
            background: text.trim() && !disabled ? currentColor : theme.borderColor,
            border: "none",
            borderRadius: 6,
            padding: "6px 8px",
            cursor: text.trim() && !disabled ? "pointer" : "not-allowed",
            display: "flex",
            alignItems: "center",
            transition: "background 0.15s",
            flexShrink: 0,
          }}
        >
          <Send size={16} color="white" />
        </button>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 6,
          fontSize: 11,
          color: theme.textMuted,
        }}
      >
        <div style={{ position: "relative" }} ref={menuRef}>
          <button
            onClick={() => setShowModeMenu(!showModeMenu)}
            style={{
              background: "none",
              border: `1px solid ${theme.borderColor}`,
              borderRadius: 5,
              padding: "2px 8px 2px 6px",
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
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: currentColor,
              }}
            />
            {currentMode.label}
            <ChevronDown size={10} />
          </button>

          {showModeMenu && (
            <div
              style={{
                position: "absolute",
                bottom: "100%",
                left: 0,
                marginBottom: 4,
                background: theme.bgCard,
                border: `1px solid ${theme.borderColor}`,
                borderRadius: 8,
                padding: 4,
                minWidth: 180,
                boxShadow: theme.shadowDialog,
                zIndex: 50,
                animation: "springIn 0.2s ease-out",
              }}
            >
              {MODES.map((m) => {
                const mColor = m.getColor(theme.lavender);
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      setMode(m.id);
                      setShowModeMenu(false);
                    }}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      background: mode === m.id ? theme.lavenderLight : "transparent",
                      border: "none",
                      borderRadius: 6,
                      cursor: "pointer",
                      textAlign: "left",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = theme.lavenderLight)}
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background =
                        mode === m.id ? theme.lavenderLight : "transparent")
                    }
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: mColor,
                        flexShrink: 0,
                      }}
                    />
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: theme.textPrimary }}>
                        {m.label}
                      </div>
                      <div style={{ fontSize: 10, color: theme.textMuted }}>{m.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <span>
          Shift+Tab to switch mode &middot; Cmd+Enter to send
        </span>
      </div>
    </div>
  );
}
