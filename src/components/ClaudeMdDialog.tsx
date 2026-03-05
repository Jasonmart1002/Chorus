import { useState, useEffect } from "react";
import { FileText, Save, Plus } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { useThemeStore } from "../store/themeStore";
import { toast } from "../store/toastStore";
import { homeDir } from "../lib/platform";
import { Dialog } from "./ui/Dialog";
import { Button } from "./ui/Button";

type Tab = "project" | "user";

interface Props {
  open: boolean;
  onClose: () => void;
  cwd: string;
}

export function ClaudeMdDialog({ open, onClose, cwd }: Props) {
  const theme = useThemeStore((s) => s.current);
  const [tab, setTab] = useState<Tab>("project");
  const [content, setContent] = useState("");
  const [exists, setExists] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);

  const loadFile = async (scope: Tab) => {
    setLoading(true);
    setDirty(false);
    try {
      const path =
        scope === "project"
          ? `${cwd}/CLAUDE.md`
          : `${await homeDir()}/.claude/CLAUDE.md`;

      const fileExists = await invoke<boolean>("file_exists", { path });
      setExists(fileExists);

      if (fileExists) {
        const text = await invoke<string>("read_file", { path });
        setContent(text);
      } else {
        setContent("");
      }
    } catch {
      setContent("");
      setExists(false);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (open) loadFile(tab);
  }, [open, tab, cwd]);

  const handleSave = async () => {
    try {
      const path =
        tab === "project"
          ? `${cwd}/CLAUDE.md`
          : `${await homeDir()}/.claude/CLAUDE.md`;

      await invoke("write_file", { path, content });
      setExists(true);
      setDirty(false);
      toast.success("CLAUDE.md saved");
    } catch (err) {
      toast.error(`Failed to save: ${String(err)}`);
    }
  };

  const handleCreate = async () => {
    const defaultContent =
      tab === "project"
        ? "# Project Instructions\n\nAdd project-specific instructions for Claude here.\n"
        : "# User Instructions\n\nAdd personal instructions for Claude here.\n";
    setContent(defaultContent);
    setDirty(true);
  };

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: "6px 16px",
    background: active ? theme.pink + "22" : "transparent",
    border: active ? `2px solid ${theme.pink}` : `2px solid ${theme.borderColor}`,
    borderRadius: theme.borderRadiusSm,
    color: active ? theme.pink : theme.textSecondary,
    fontSize: 12,
    fontWeight: 700,
    fontFamily: theme.fontHeading,
    cursor: "pointer",
    transition: "all 0.15s ease",
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      onSubmit={dirty ? handleSave : undefined}
      title="CLAUDE.md"
      description="Instructions loaded by Claude at the start of each conversation"
      width={600}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          {!exists && !dirty ? (
            <Button
              variant="primary"
              onClick={handleCreate}
              icon={<Plus size={14} />}
            >
              Create
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={!dirty}
              icon={<Save size={14} />}
            >
              Save
            </Button>
          )}
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Tabs */}
        <div style={{ display: "flex", gap: 8 }}>
          <button style={tabStyle(tab === "project")} onClick={() => setTab("project")}>
            <FileText size={11} style={{ marginRight: 4, verticalAlign: -1 }} />
            Project
          </button>
          <button style={tabStyle(tab === "user")} onClick={() => setTab("user")}>
            <FileText size={11} style={{ marginRight: 4, verticalAlign: -1 }} />
            User
          </button>
        </div>

        {/* Path indicator */}
        <div
          style={{
            fontSize: 11,
            fontFamily: theme.fontCode,
            color: theme.textMuted,
            padding: "4px 8px",
            background: theme.bgBase,
            borderRadius: theme.borderRadiusSm,
            border: `1px solid ${theme.borderColor}`,
          }}
        >
          {tab === "project" ? `${cwd}/CLAUDE.md` : "~/.claude/CLAUDE.md"}
        </div>

        {/* Editor */}
        {loading ? (
          <div style={{ padding: 20, textAlign: "center", color: theme.textMuted, fontSize: 13 }}>
            Loading...
          </div>
        ) : !exists && !dirty ? (
          <div
            style={{
              padding: "32px 20px",
              textAlign: "center",
              color: theme.textMuted,
              fontSize: 13,
              fontFamily: theme.fontBody,
              background: theme.bgBase,
              borderRadius: theme.borderRadiusSm,
              border: `2px dashed ${theme.borderColor}`,
            }}
          >
            No CLAUDE.md file found. Click "Create" to start one.
          </div>
        ) : (
          <textarea
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              setDirty(true);
            }}
            style={{
              width: "100%",
              minHeight: 300,
              padding: 12,
              background: theme.bgBase,
              border: `2px solid ${dirty ? theme.pink : theme.borderStrong}`,
              borderRadius: theme.borderRadiusSm,
              color: theme.textPrimary,
              fontSize: 13,
              fontFamily: theme.fontCode,
              lineHeight: 1.6,
              resize: "vertical",
              outline: "none",
            }}
            placeholder="Write instructions for Claude..."
          />
        )}
      </div>
    </Dialog>
  );
}
