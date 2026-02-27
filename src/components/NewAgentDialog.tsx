import { useState, useEffect } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { FolderOpen, CheckCircle, XCircle } from "lucide-react";
import { useAgentStore } from "../store/agentStore";
import { useThemeStore } from "../store/themeStore";
import { DEFAULT_PERMISSION_MODE } from "../lib/constants";
import { basename } from "../lib/platform";
import type { Engine, EngineInfo } from "../types/agent";
import { ENGINE_LABELS, ENGINE_INSTALL_HINTS } from "../types/agent";
import { Dialog } from "./ui/Dialog";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { IconButton } from "./ui/IconButton";

interface Props {
  onClose: () => void;
}

const ENGINE_COLORS: Record<Engine, string> = {
  claude: "#c4a7e7",  // lavender
  codex: "#a6e3a1",   // green
  gemini: "#89b4fa",  // blue
};

export function NewAgentDialog({ onClose }: Props) {
  const createAgent = useAgentStore((s) => s.createAgent);
  const detectEngines = useAgentStore((s) => s.detectEngines);
  const theme = useThemeStore((s) => s.current);
  const [name, setName] = useState("");
  const [cwd, setCwd] = useState("");
  const [permMode, setPermMode] = useState(DEFAULT_PERMISSION_MODE);
  const [engine, setEngine] = useState<Engine>("claude");
  const [engines, setEngines] = useState<EngineInfo[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Detect available engines on mount
  useEffect(() => {
    detectEngines()
      .then((info) => {
        setEngines(info);
        // Auto-select first available engine
        const firstAvailable = info.find((e) => e.available);
        if (firstAvailable) {
          setEngine(firstAvailable.engine);
        }
      })
      .catch(() => {
        // Fallback: assume Claude is available
        setEngines([{ engine: "claude", available: true, binary_path: null }]);
      });
  }, [detectEngines]);

  const handlePickDir = async () => {
    const selected = await open({ directory: true, multiple: false });
    if (selected && typeof selected === "string") {
      setCwd(selected);
      if (!name) {
        setName(basename(selected));
      }
    }
  };

  const handleCreate = async () => {
    if (!name.trim() || !cwd.trim()) return;
    setCreating(true);
    setError(null);
    try {
      await createAgent(name.trim(), cwd.trim(), undefined, permMode, engine);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("Failed to create agent:", message);
      setError(message);
      setCreating(false);
    }
  };

  const selectedEngineInfo = engines.find((e) => e.engine === engine);
  const isEngineAvailable = selectedEngineInfo?.available !== false;
  const isReady = !!(name.trim() && cwd.trim() && !creating && isEngineAvailable);

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    fontFamily: theme.fontBody,
    color: theme.textSecondary,
    display: "block",
    marginBottom: 4,
  };

  return (
    <Dialog
      open={true}
      onClose={onClose}
      onSubmit={handleCreate}
      title="New Agent"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleCreate}
            disabled={!isReady}
            loading={creating}
          >
            Create Agent
          </Button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Engine selector — prominent card-style buttons */}
        <label style={{ display: "block" }}>
          <span style={labelStyle}>Engine</span>
          <div style={{ display: "flex", gap: 8 }}>
            {(["claude", "codex", "gemini"] as Engine[]).map((eng) => {
              const info = engines.find((e) => e.engine === eng);
              const available = info?.available ?? false;
              const selected = engine === eng;
              const color = ENGINE_COLORS[eng];

              return (
                <button
                  key={eng}
                  onClick={() => setEngine(eng)}
                  style={{
                    flex: 1,
                    padding: "10px 8px",
                    background: selected ? color + "22" : theme.bgBase,
                    border: `2px solid ${selected ? color : theme.borderColor}`,
                    borderRadius: theme.borderRadiusSm,
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 4,
                    transition: "all 0.15s ease",
                    opacity: available ? 1 : 0.5,
                    boxShadow: selected ? theme.shadowChunky : "none",
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      fontFamily: theme.fontHeading,
                      color: selected ? color : theme.textPrimary,
                      letterSpacing: "0.01em",
                    }}
                  >
                    {ENGINE_LABELS[eng]}
                  </span>
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 3,
                      fontSize: 10,
                      color: available ? theme.mint : theme.textMuted,
                      fontFamily: theme.fontBody,
                    }}
                  >
                    {available ? (
                      <>
                        <CheckCircle size={10} />
                        Installed
                      </>
                    ) : (
                      <>
                        <XCircle size={10} />
                        Not found
                      </>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
          {!isEngineAvailable && (
            <div
              style={{
                marginTop: 6,
                padding: "6px 10px",
                background: theme.peachLight,
                border: `1px solid ${theme.peach}`,
                borderRadius: theme.borderRadiusSm,
                fontSize: 11,
                color: theme.textSecondary,
                fontFamily: theme.fontCode,
              }}
            >
              Install with: <strong>{ENGINE_INSTALL_HINTS[engine]}</strong>
            </div>
          )}
        </label>

        <label style={{ display: "block" }}>
          <span style={labelStyle}>Name</span>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="my-project"
            autoFocus
          />
        </label>

        <label style={{ display: "block" }}>
          <span style={labelStyle}>Working Directory</span>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <Input
                value={cwd}
                onChange={(e) => setCwd(e.target.value)}
                placeholder="/path/to/project"
              />
            </div>
            <IconButton
              icon={<FolderOpen size={16} />}
              tooltip="Browse"
              onClick={handlePickDir}
              variant="tinted"
              tintColor={theme.pink}
              size="md"
            />
          </div>
        </label>

        <label style={{ display: "block" }}>
          <span style={labelStyle}>Permission Mode</span>
          <select
            value={permMode}
            onChange={(e) => setPermMode(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px",
              background: theme.bgBase,
              border: `2px solid ${theme.borderStrong}`,
              borderRadius: theme.borderRadiusSm,
              color: theme.textPrimary,
              fontSize: 14,
              fontFamily: theme.fontBody,
              outline: "none",
            }}
          >
            <option value="bypassPermissions">Bypass Permissions (auto-approve all)</option>
            <option value="default">Default (ask for approval)</option>
          </select>
        </label>

        {error && (
          <div
            style={{
              padding: "8px 12px",
              background: theme.peachLight,
              border: `2px solid ${theme.peach}`,
              borderRadius: theme.borderRadiusSm,
              color: theme.textPrimary,
              fontSize: 12,
              fontFamily: theme.fontBody,
              wordBreak: "break-word",
            }}
          >
            {error}
          </div>
        )}
      </div>
    </Dialog>
  );
}
