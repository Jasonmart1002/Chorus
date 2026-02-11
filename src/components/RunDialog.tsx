import { useState, useRef, useEffect } from "react";
import { Play, Plus, X, Loader, Square, ChevronDown, Settings } from "lucide-react";
import { useAgentStore } from "../store/agentStore";
import { useThemeStore } from "../store/themeStore";

const PRESETS = [
  "npm run dev",
  "npm run build",
  "npm start",
  "npm test",
  "npm install",
  "yarn dev",
  "pnpm dev",
  "bun dev",
];

interface Props {
  cwd: string;
  onClose: () => void;
}

interface EnvVar {
  key: string;
  value: string;
}

export function RunDialog({ cwd, onClose }: Props) {
  const startCommand = useAgentStore((s) => s.startCommand);
  const killRunningCommand = useAgentStore((s) => s.killRunningCommand);
  const commandState = useAgentStore((s) => s.commandStates[cwd]);
  const savedCommands = useAgentStore((s) => s.savedCommands);
  const dismissCommandOutput = useAgentStore((s) => s.dismissCommandOutput);
  const theme = useThemeStore((s) => s.current);

  const savedCmd = savedCommands[cwd] || "npm run dev";
  const [command, setCommand] = useState(savedCmd);
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);
  const [showPresets, setShowPresets] = useState(false);
  const [showEnvVars, setShowEnvVars] = useState(false);
  const cmdRef = useRef<HTMLTextAreaElement>(null);
  const presetsRef = useRef<HTMLDivElement>(null);

  const isRunning = commandState?.running === true;
  const lines = commandState?.lines ?? [];
  const exitCode = commandState?.exitCode;
  const isDone = commandState != null && !commandState.running && exitCode !== undefined;
  const runningCommand = commandState?.command;
  const outputRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [lines.length]);

  useEffect(() => {
    if (!isRunning) {
      cmdRef.current?.focus();
      cmdRef.current?.select();
    }
  }, [isRunning]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (presetsRef.current && !presetsRef.current.contains(e.target as Node)) {
        setShowPresets(false);
      }
    };
    if (showPresets) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showPresets]);

  const handleAddEnv = () => {
    setEnvVars([...envVars, { key: "", value: "" }]);
    setShowEnvVars(true);
  };

  const handleRemoveEnv = (idx: number) => {
    setEnvVars(envVars.filter((_, i) => i !== idx));
  };

  const handleEnvChange = (idx: number, field: "key" | "value", val: string) => {
    setEnvVars(envVars.map((ev, i) => (i === idx ? { ...ev, [field]: val } : ev)));
  };

  const handleRun = () => {
    if (!command.trim()) return;
    const envMap: Record<string, string> = {};
    for (const ev of envVars) {
      if (ev.key.trim()) {
        envMap[ev.key.trim()] = ev.value;
      }
    }
    startCommand(
      cwd,
      command.trim(),
      Object.keys(envMap).length > 0 ? envMap : undefined
    );
  };

  const handleStop = async () => {
    await killRunningCommand(cwd);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !isRunning) {
      e.preventDefault();
      handleRun();
    }
  };

  const dirName = cwd.split("/").pop() || cwd;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(74, 74, 74, 0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={handleKeyDown}
    >
      <div
        style={{
          background: theme.bgCard,
          borderRadius: 12,
          padding: 0,
          width: 520,
          maxWidth: "90vw",
          maxHeight: "80vh",
          boxShadow: theme.shadowDialog,
          border: `1px solid ${theme.mauve}`,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          animation: "springIn 0.25s ease-out",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: `1px solid ${theme.borderColor}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: theme.textPrimary, fontFamily: theme.fontHeading }}>
              Run
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: theme.textMuted }}>
              Run commands in <strong style={{ color: theme.textSecondary }}>{dirName}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: theme.textMuted,
              cursor: "pointer",
              padding: 4,
              display: "flex",
              borderRadius: 4,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "16px 20px", overflowY: "auto", flex: 1 }}>
          <label style={{ display: "block", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: theme.textSecondary }}>Command</span>
              <div style={{ display: "flex", gap: 4 }}>
                <div style={{ position: "relative" }} ref={presetsRef}>
                  <button
                    onClick={() => setShowPresets(!showPresets)}
                    style={{
                      background: "none",
                      border: `1px solid ${theme.borderColor}`,
                      borderRadius: 5,
                      padding: "2px 8px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 3,
                      fontSize: 11,
                      color: theme.lavender,
                    }}
                  >
                    <Settings size={10} />
                    Presets
                    <ChevronDown size={10} />
                  </button>

                  {showPresets && (
                    <div
                      style={{
                        position: "absolute",
                        top: "100%",
                        right: 0,
                        marginTop: 4,
                        background: theme.bgCard,
                        border: `1px solid ${theme.borderColor}`,
                        borderRadius: 8,
                        padding: 4,
                        minWidth: 180,
                        boxShadow: theme.shadowDialog,
                        zIndex: 60,
                      }}
                    >
                      {PRESETS.map((preset) => (
                        <button
                          key={preset}
                          onClick={() => {
                            setCommand(preset);
                            setShowPresets(false);
                          }}
                          style={{
                            width: "100%",
                            padding: "6px 10px",
                            background: command === preset ? theme.lavenderLight : "transparent",
                            border: "none",
                            borderRadius: 5,
                            cursor: "pointer",
                            textAlign: "left",
                            fontSize: 12,
                            color: theme.textPrimary,
                            fontFamily: theme.fontCode,
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = theme.lavenderLight)}
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background =
                              command === preset ? theme.lavenderLight : "transparent")
                          }
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <textarea
              ref={cmdRef}
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder={"eg: npm run dev"}
              disabled={isRunning}
              rows={2}
              style={{
                width: "100%",
                padding: "10px 12px",
                background: theme.bgBase,
                border: `1px solid ${theme.mauve}`,
                borderRadius: 8,
                color: isRunning ? theme.textMuted : theme.textPrimary,
                fontSize: 13,
                fontFamily: theme.fontCode,
                outline: "none",
                resize: "vertical",
                lineHeight: 1.5,
                boxSizing: "border-box",
                transition: "border-color 0.15s",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = theme.lavender)}
              onBlur={(e) => (e.currentTarget.style.borderColor = theme.mauve)}
            />
          </label>

          {/* Env vars toggle */}
          <div style={{ marginBottom: 16 }}>
            <button
              onClick={() => {
                if (!showEnvVars && envVars.length === 0) handleAddEnv();
                else setShowEnvVars(!showEnvVars);
              }}
              style={{
                background: "none",
                border: "none",
                color: theme.lavender,
                cursor: "pointer",
                fontSize: 11,
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "2px 0",
              }}
            >
              <Plus size={11} />
              Environment variables
              {envVars.length > 0 && (
                <span style={{ color: theme.textMuted }}>({envVars.length})</span>
              )}
            </button>

            {showEnvVars && (
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                {envVars.map((ev, idx) => (
                  <div key={idx} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input
                      value={ev.key}
                      onChange={(e) => handleEnvChange(idx, "key", e.target.value)}
                      placeholder="KEY"
                      style={{
                        width: 140,
                        padding: "6px 10px",
                        background: theme.bgBase,
                        border: `1px solid ${theme.mauve}`,
                        borderRadius: 6,
                        color: theme.textPrimary,
                        fontSize: 12,
                        fontFamily: theme.fontCode,
                        outline: "none",
                      }}
                    />
                    <span style={{ color: theme.textMuted }}>=</span>
                    <input
                      value={ev.value}
                      onChange={(e) => handleEnvChange(idx, "value", e.target.value)}
                      placeholder="value"
                      style={{
                        flex: 1,
                        padding: "6px 10px",
                        background: theme.bgBase,
                        border: `1px solid ${theme.mauve}`,
                        borderRadius: 6,
                        color: theme.textPrimary,
                        fontSize: 12,
                        fontFamily: theme.fontCode,
                        outline: "none",
                      }}
                    />
                    <button
                      onClick={() => handleRemoveEnv(idx)}
                      style={{
                        background: "none",
                        border: "none",
                        color: theme.textMuted,
                        cursor: "pointer",
                        padding: 2,
                        display: "flex",
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={handleAddEnv}
                  style={{
                    background: "none",
                    border: "none",
                    color: theme.textMuted,
                    cursor: "pointer",
                    fontSize: 11,
                    padding: "2px 0",
                    alignSelf: "flex-start",
                  }}
                >
                  + Add another
                </button>
              </div>
            )}
          </div>

          {/* Streaming output */}
          {(isRunning || isDone) && (
            <div
              style={{
                background: theme.bgBase,
                borderRadius: 8,
                border: `1px solid ${
                  isRunning
                    ? theme.lavender
                    : exitCode === 0
                    ? theme.borderColor
                    : exitCode === null
                    ? theme.butter
                    : theme.peach
                }`,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "6px 12px",
                  borderBottom: `1px solid ${theme.borderColor}`,
                  fontSize: 11,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  color: isRunning
                    ? theme.lavender
                    : exitCode === 0
                    ? theme.mint
                    : exitCode === null
                    ? "#C8A951"
                    : theme.peach,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {isRunning && <Loader size={11} style={{ animation: "spin 1s linear infinite" }} />}
                  <span>
                    {isRunning
                      ? `Running: ${runningCommand}`
                      : exitCode === 0
                      ? "Completed"
                      : exitCode === null
                      ? "Stopped"
                      : `Exited with code ${exitCode}`}
                  </span>
                </div>
                {isDone && (
                  <button
                    onClick={() => dismissCommandOutput(cwd)}
                    style={{
                      background: "none",
                      border: "none",
                      color: theme.textMuted,
                      cursor: "pointer",
                      padding: 2,
                      display: "flex",
                    }}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              <div
                style={{
                  padding: "4px 12px",
                  borderBottom: `1px solid ${theme.borderColor}50`,
                  fontSize: 10,
                  color: theme.textMuted,
                  fontFamily: theme.fontCode,
                }}
              >
                {commandState?.cwd}
              </div>

              <pre
                ref={outputRef}
                style={{
                  padding: "8px 12px",
                  margin: 0,
                  fontSize: 11,
                  color: theme.textPrimary,
                  fontFamily: theme.fontCode,
                  maxHeight: 250,
                  overflow: "auto",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                }}
              >
                {lines.length > 0 ? lines.join("\n") : isRunning ? "Waiting for output..." : "(no output)"}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "12px 20px",
            borderTop: `1px solid ${theme.borderColor}`,
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "8px 16px",
              background: "transparent",
              border: `1px solid ${theme.borderColor}`,
              borderRadius: 6,
              color: theme.textSecondary,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            {isRunning ? "Close (keeps running)" : "Close"}
          </button>
          {isRunning ? (
            <button
              onClick={handleStop}
              style={{
                padding: "8px 20px",
                background: theme.peach,
                border: "none",
                borderRadius: 6,
                color: "white",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 6,
                boxShadow: theme.shadowChunky,
                fontFamily: theme.fontHeading,
              }}
            >
              <Square size={14} />
              Stop
            </button>
          ) : (
            <button
              onClick={handleRun}
              disabled={!command.trim()}
              style={{
                padding: "8px 20px",
                background: command.trim() ? theme.mint : theme.borderColor,
                border: "none",
                borderRadius: 6,
                color: "white",
                cursor: command.trim() ? "pointer" : "not-allowed",
                fontSize: 13,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 6,
                boxShadow: command.trim() ? theme.shadowChunky : undefined,
                fontFamily: theme.fontHeading,
              }}
            >
              <Play size={14} />
              Run
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
