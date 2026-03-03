import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { FolderOpen } from "lucide-react";
import { useAgentStore } from "../store/agentStore";
import { useThemeStore } from "../store/themeStore";
import { DEFAULT_PERMISSION_MODE } from "../lib/constants";
import { basename } from "../lib/platform";
import { Dialog } from "./ui/Dialog";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { IconButton } from "./ui/IconButton";

interface Props {
  onClose: () => void;
}

const MODELS = [
  { value: "", label: "Default", description: "Uses your CLI default" },
  { value: "sonnet", label: "Sonnet 4.6", description: "Fast & capable" },
  { value: "opus", label: "Opus 4.6", description: "Most intelligent" },
  { value: "haiku", label: "Haiku 4.5", description: "Quick & light" },
];

export function NewAgentDialog({ onClose }: Props) {
  const createAgent = useAgentStore((s) => s.createAgent);
  const theme = useThemeStore((s) => s.current);
  const [name, setName] = useState("");
  const [cwd, setCwd] = useState("");
  const [model, setModel] = useState("");
  const [permMode, setPermMode] = useState(DEFAULT_PERMISSION_MODE);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      await createAgent(
        name.trim(),
        cwd.trim(),
        model || undefined,
        permMode,
        "claude"
      );
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("Failed to create agent:", message);
      setError(message);
      setCreating(false);
    }
  };

  const isReady = !!(name.trim() && cwd.trim() && !creating);

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

        {/* Model selector */}
        <label style={{ display: "block" }}>
          <span style={labelStyle}>Model</span>
          <div style={{ display: "flex", gap: 6 }}>
            {MODELS.map((m) => {
              const selected = model === m.value;
              return (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setModel(m.value)}
                  style={{
                    flex: 1,
                    padding: "8px 6px",
                    background: selected ? `${theme.mauve}22` : theme.bgBase,
                    border: selected
                      ? `2px solid ${theme.mauve}`
                      : `2px solid ${theme.borderStrong}`,
                    borderRadius: theme.borderRadiusSm,
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 2,
                    transition: `all 0.15s ${theme.easeSpring}`,
                    boxShadow: selected ? theme.shadowChunky : "none",
                    transform: selected ? "scale(1.03)" : "scale(1)",
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      fontFamily: theme.fontHeading,
                      color: selected ? theme.mauve : theme.textPrimary,
                      letterSpacing: "0.01em",
                    }}
                  >
                    {m.label}
                  </span>
                  <span
                    style={{
                      fontSize: 9,
                      color: theme.textMuted,
                      fontFamily: theme.fontBody,
                    }}
                  >
                    {m.description}
                  </span>
                </button>
              );
            })}
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
