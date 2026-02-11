import { useState, useEffect, useRef } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { FolderOpen } from "lucide-react";
import { useAgentStore } from "../store/agentStore";
import { useThemeStore } from "../store/themeStore";
import { DEFAULT_PERMISSION_MODE } from "../lib/constants";

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
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleCreate();
  };

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
          padding: 24,
          width: 420,
          maxWidth: "90vw",
          boxShadow: theme.shadowDialog,
          border: `1px solid ${theme.mauve}`,
          animation: "springIn 0.25s ease-out",
        }}
      >
        <h2 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 700, color: theme.textPrimary, fontFamily: theme.fontHeading }}>
          New Agent
        </h2>

        <label style={{ display: "block", marginBottom: 12 }}>
          <span style={{ fontSize: 12, color: theme.textSecondary, display: "block", marginBottom: 4 }}>Name</span>
          <input
            ref={nameRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="my-project"
            style={{
              width: "100%",
              padding: "8px 12px",
              background: theme.bgBase,
              border: `1px solid ${theme.mauve}`,
              borderRadius: 6,
              color: theme.textPrimary,
              fontSize: 14,
              outline: "none",
              boxSizing: "border-box",
              transition: "border-color 0.15s",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = theme.lavender)}
            onBlur={(e) => (e.currentTarget.style.borderColor = theme.mauve)}
          />
        </label>

        <label style={{ display: "block", marginBottom: 12 }}>
          <span style={{ fontSize: 12, color: theme.textSecondary, display: "block", marginBottom: 4 }}>
            Working Directory
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={cwd}
              onChange={(e) => setCwd(e.target.value)}
              placeholder="/path/to/project"
              style={{
                flex: 1,
                padding: "8px 12px",
                background: theme.bgBase,
                border: `1px solid ${theme.mauve}`,
                borderRadius: 6,
                color: theme.textPrimary,
                fontSize: 14,
                outline: "none",
                transition: "border-color 0.15s",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = theme.lavender)}
              onBlur={(e) => (e.currentTarget.style.borderColor = theme.mauve)}
            />
            <button
              onClick={handlePickDir}
              style={{
                padding: "8px 12px",
                background: theme.bgSurface,
                border: `1px solid ${theme.mauve}`,
                borderRadius: 6,
                color: theme.textPrimary,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
              }}
            >
              <FolderOpen size={16} />
            </button>
          </div>
        </label>

        <label style={{ display: "block", marginBottom: 20 }}>
          <span style={{ fontSize: 12, color: theme.textSecondary, display: "block", marginBottom: 4 }}>
            Permission Mode
          </span>
          <select
            value={permMode}
            onChange={(e) => setPermMode(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px",
              background: theme.bgBase,
              border: `1px solid ${theme.mauve}`,
              borderRadius: 6,
              color: theme.textPrimary,
              fontSize: 14,
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
              border: `1px solid ${theme.peach}`,
              borderRadius: 6,
              color: theme.textPrimary,
              fontSize: 12,
              marginBottom: 12,
              wordBreak: "break-word",
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
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
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim() || !cwd.trim() || creating}
            style={{
              padding: "8px 16px",
              background: name.trim() && cwd.trim() && !creating ? theme.lavender : theme.borderColor,
              border: "none",
              borderRadius: 6,
              color: "white",
              cursor: name.trim() && cwd.trim() && !creating ? "pointer" : "not-allowed",
              fontSize: 13,
              fontWeight: 600,
              boxShadow: name.trim() && cwd.trim() && !creating ? theme.shadowChunky : undefined,
              fontFamily: theme.fontHeading,
            }}
          >
            {creating ? "Creating..." : "Create Agent"}
          </button>
        </div>
      </div>
    </div>
  );
}
