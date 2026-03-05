import { useState, useEffect } from "react";
import { Save } from "lucide-react";
import { useHooksStore } from "../store/hooksStore";
import { useThemeStore } from "../store/themeStore";
import { Dialog } from "./ui/Dialog";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";

interface Props {
  open: boolean;
  onClose: () => void;
  skillPath?: string;
  skillName?: string;
  scope: "user" | "project";
  baseDir: string;
}

export function EditSkillDialog({ open, onClose, skillPath, skillName, scope, baseDir }: Props) {
  const theme = useThemeStore((s) => s.current);
  const readSkill = useHooksStore((s) => s.readSkill);
  const saveSkill = useHooksStore((s) => s.saveSkill);

  const [name, setName] = useState(skillName || "");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (open && skillPath) {
      setLoading(true);
      readSkill(skillPath)
        .then((c) => {
          setContent(c);
          setName(skillName || "");
        })
        .catch(() => setContent(""))
        .finally(() => setLoading(false));
    } else if (open) {
      setContent(
        `---
description: My custom skill
allowed-tools: Read, Write, Bash
---

# Skill Name

Describe what this skill does.
`
      );
      setName("");
      setDirty(false);
    }
  }, [open, skillPath]);

  const handleSave = async () => {
    const fileName = name.trim()
      ? name.trim().endsWith(".md")
        ? name.trim()
        : `${name.trim()}.md`
      : "SKILL.md";

    const path = skillPath || `${baseDir}/.claude/skills/${fileName}`;
    try {
      await saveSkill(path, content);
      setDirty(false);
      onClose();
    } catch {
      // error toasted
    }
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 700,
    fontFamily: theme.fontHeading,
    color: theme.textSecondary,
    marginBottom: 6,
    display: "block",
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      onSubmit={handleSave}
      title={skillPath ? "Edit Skill" : "New Skill"}
      description={`${scope === "project" ? "Project" : "User"} scope`}
      width={560}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} icon={<Save size={14} />}>
            Save
          </Button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {!skillPath && (
          <div>
            <label style={labelStyle}>File Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="SKILL.md"
              style={{ fontSize: 12, fontFamily: theme.fontCode }}
            />
          </div>
        )}

        {loading ? (
          <div style={{ padding: 20, textAlign: "center", color: theme.textMuted }}>
            Loading...
          </div>
        ) : (
          <div>
            <label style={labelStyle}>Content (Markdown)</label>
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
                fontSize: 12,
                fontFamily: theme.fontCode,
                lineHeight: 1.6,
                resize: "vertical",
                outline: "none",
              }}
              placeholder="Write your skill instructions..."
            />
          </div>
        )}
      </div>
    </Dialog>
  );
}
