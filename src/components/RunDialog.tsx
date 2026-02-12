import { useState, useRef, useEffect } from "react";
import { Play, Plus, X, Loader, Square, Settings, ChevronDown } from "lucide-react";
import { useAgentStore } from "../store/agentStore";
import { useThemeStore } from "../store/themeStore";
import { Dialog } from "./ui/Dialog";
import { Button } from "./ui/Button";
import { Textarea } from "./ui/Textarea";
import { Input } from "./ui/Input";
import { IconButton } from "./ui/IconButton";
import { DropdownMenu, DropdownMenuItem } from "./ui/DropdownMenu";

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

  const dirName = cwd.split("/").pop() || cwd;

  return (
    <Dialog
      open={true}
      onClose={onClose}
      title="Run"
      description={`Run commands in ${dirName}`}
      width={520}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {isRunning ? "Close (keeps running)" : "Close"}
          </Button>
          {isRunning ? (
            <Button variant="danger" onClick={handleStop} icon={<Square size={14} />}>
              Stop
            </Button>
          ) : (
            <Button
              variant="primary"
              color={theme.mint}
              onClick={handleRun}
              disabled={!command.trim()}
              icon={<Play size={14} />}
            >
              Run
            </Button>
          )}
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Command input */}
        <label style={{ display: "block" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, fontFamily: theme.fontBody, color: theme.textSecondary }}>Command</span>
            <DropdownMenu
              trigger={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPresets(!showPresets)}
                  icon={<Settings size={10} />}
                  style={{ color: theme.pink, fontSize: 11, padding: "2px 8px" }}
                >
                  Presets
                  <ChevronDown size={10} />
                </Button>
              }
              open={showPresets}
              onOpenChange={setShowPresets}
              align="end"
            >
              {PRESETS.map((preset) => (
                <DropdownMenuItem
                  key={preset}
                  onClick={() => {
                    setCommand(preset);
                    setShowPresets(false);
                  }}
                  active={command === preset}
                >
                  <span style={{ fontFamily: theme.fontCode }}>{preset}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenu>
          </div>
          <Textarea
            ref={cmdRef}
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="eg: npm run dev"
            disabled={isRunning}
            rows={2}
            style={{
              fontSize: 13,
              fontFamily: theme.fontCode,
              color: isRunning ? theme.textMuted : theme.textPrimary,
            }}
          />
        </label>

        {/* Env vars toggle */}
        <div>
          <button
            onClick={() => {
              if (!showEnvVars && envVars.length === 0) handleAddEnv();
              else setShowEnvVars(!showEnvVars);
            }}
            style={{
              background: "none",
              border: "none",
              color: theme.pink,
              cursor: "pointer",
              fontSize: 11,
              fontFamily: theme.fontBody,
              fontWeight: 600,
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
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
              {envVars.map((ev, idx) => (
                <div key={idx} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <Input
                    value={ev.key}
                    onChange={(e) => handleEnvChange(idx, "key", e.target.value)}
                    placeholder="KEY"
                    style={{ width: 140, fontSize: 12, fontFamily: theme.fontCode }}
                  />
                  <span style={{ color: theme.textMuted }}>=</span>
                  <div style={{ flex: 1 }}>
                    <Input
                      value={ev.value}
                      onChange={(e) => handleEnvChange(idx, "value", e.target.value)}
                      placeholder="value"
                      style={{ fontSize: 12, fontFamily: theme.fontCode }}
                    />
                  </div>
                  <IconButton
                    icon={<X size={14} />}
                    tooltip="Remove"
                    onClick={() => handleRemoveEnv(idx)}
                    hoverColor={theme.peach}
                  />
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
                  fontFamily: theme.fontBody,
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
              borderRadius: theme.borderRadiusSm,
              border: `2px solid ${
                isRunning
                  ? theme.pink
                  : exitCode === 0
                  ? theme.borderColor
                  : exitCode === null
                  ? theme.gold
                  : theme.peach
              }`,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "8px 12px",
                borderBottom: `1px solid ${theme.borderColor}`,
                fontSize: 11,
                fontWeight: 600,
                fontFamily: theme.fontBody,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                color: isRunning
                  ? theme.pink
                  : exitCode === 0
                  ? theme.mint
                  : exitCode === null
                  ? theme.gold
                  : theme.peach,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
                <IconButton
                  icon={<X size={12} />}
                  tooltip="Dismiss"
                  onClick={() => dismissCommandOutput(cwd)}
                  size="sm"
                />
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
    </Dialog>
  );
}
