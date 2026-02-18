import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { FolderOpen } from "lucide-react";
import { useAgentStore } from "../store/agentStore";
import { useThemeStore } from "../store/themeStore";
import { DEFAULT_PERMISSION_MODE } from "../lib/constants";
import { Dialog } from "./ui/Dialog";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { IconButton } from "./ui/IconButton";

interface Props {
  onClose: () => void;
}

export function NewAgentDialog({ onClose }: Props) {
  const createAgent = useAgentStore((s) => s.createAgent);
  const theme = useThemeStore((s) => s.current);
  const [name, setName] = useState("");
  const [cwd, setCwd] = useState("");
  const [permMode, setPermMode] = useState(DEFAULT_PERMISSION_MODE);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePickDir = async () => {
    const selected = await open({ directory: true, multiple: false });
    if (selected && typeof selected === "string") {
      setCwd(selected);
      if (!name) {
        setName(selected.split("/").pop() || "");
      }
    }
  };

  const handleCreate = async () => {
    if (!name.trim() || !cwd.trim()) return;
    setCreating(true);
    setError(null);
    try {
      await createAgent(name.trim(), cwd.trim(), undefined, permMode);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("Failed to create agent:", message);
      setError(message);
      setCreating(false);
    }
  };

  const isReady = !!(name.trim() && cwd.trim() && !creating);

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
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              fontFamily: theme.fontBody,
              color: theme.textSecondary,
              display: "block",
              marginBottom: 4,
            }}
          >
            Name
          </span>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="my-project"
            autoFocus
          />
        </label>

        <label style={{ display: "block" }}>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              fontFamily: theme.fontBody,
              color: theme.textSecondary,
              display: "block",
              marginBottom: 4,
            }}
          >
            Working Directory
          </span>
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
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              fontFamily: theme.fontBody,
              color: theme.textSecondary,
              display: "block",
              marginBottom: 4,
            }}
          >
            Permission Mode
          </span>
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
