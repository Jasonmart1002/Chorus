import { useEffect, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { FolderOpen, Code2, Bug, BookOpen, Sparkles } from "lucide-react";
import { useAgentStore } from "../store/agentStore";
import { useThemeStore } from "../store/themeStore";
import { DEFAULT_PERMISSION_MODE } from "../lib/constants";
import { basename } from "../lib/platform";
import type { EngineInfo } from "../types/agent";
import { Dialog } from "./ui/Dialog";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { IconButton } from "./ui/IconButton";

interface Props {
  onClose: () => void;
}

interface Template {
  icon: React.ComponentType<{
    size?: number;
    color?: string;
    strokeWidth?: number;
  }>;
  name: string;
  color: string;
  prompt: string;
}

const TEMPLATES: Template[] = [
  {
    icon: Code2,
    name: "Code Reviewer",
    color: "sapphire",
    prompt:
      "You are a code reviewer. Review code changes for bugs, style issues, security problems, and suggest improvements. Be thorough but constructive.",
  },
  {
    icon: Bug,
    name: "Bug Fixer",
    color: "peach",
    prompt:
      "You are a debugging specialist. Help find and fix bugs efficiently. Start by understanding the symptoms, then investigate root causes systematically.",
  },
  {
    icon: BookOpen,
    name: "Doc Writer",
    color: "mint",
    prompt:
      "You are a documentation specialist. Write clear, concise documentation for codebases. Focus on architecture overviews, API docs, and inline comments.",
  },
  {
    icon: Sparkles,
    name: "Refactor Pro",
    color: "mauve",
    prompt:
      "You are a refactoring expert. Improve code quality, reduce duplication, and modernize patterns while maintaining existing behavior. Always run tests after changes.",
  },
];

const MODELS = [
  { value: "", label: "Default", description: "Uses your CLI default" },
  { value: "sonnet", label: "Sonnet 4.6", description: "Fast & capable" },
  { value: "opus", label: "Opus 4.6", description: "Most intelligent" },
  { value: "haiku", label: "Haiku 4.5", description: "Quick & light" },
];

export function NewAgentDialog({ onClose }: Props) {
  const createAgent = useAgentStore((s) => s.createAgent);
  const detectEngines = useAgentStore((s) => s.detectEngines);
  const theme = useThemeStore((s) => s.current);
  const [name, setName] = useState("");
  const [cwd, setCwd] = useState("");
  const [model, setModel] = useState("");
  const [permMode, setPermMode] = useState(DEFAULT_PERMISSION_MODE);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [enginesLoaded, setEnginesLoaded] = useState(false);
  const [claudeInfo, setClaudeInfo] = useState<EngineInfo | null>(null);

  useEffect(() => {
    detectEngines()
      .then((engines) => {
        setClaudeInfo(engines.find((info) => info.engine === "claude") || null);
      })
      .catch(() => {})
      .finally(() => setEnginesLoaded(true));
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

  const handleSelectTemplate = (idx: number) => {
    if (selectedTemplate === idx) {
      setSelectedTemplate(null);
      setName("");
    } else {
      setSelectedTemplate(idx);
      setName(TEMPLATES[idx].name);
    }
  };

  const handleCreate = async () => {
    if (!name.trim() || !cwd.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const agentId = await createAgent(
        name.trim(),
        cwd.trim(),
        model || undefined,
        permMode,
        "claude",
      );
      // If a template was selected, send the system prompt as initial message
      if (selectedTemplate !== null) {
        const tmpl = TEMPLATES[selectedTemplate];
        try {
          await useAgentStore.getState().sendPrompt(agentId, tmpl.prompt);
        } catch {
          // Agent created successfully, prompt send is best-effort
        }
      }
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("Failed to create agent:", message);
      setError(message);
      setCreating(false);
    }
  };

  const claudeAvailable = claudeInfo?.available ?? !enginesLoaded;
  const isReady = !!(name.trim() && cwd.trim() && !creating && claudeAvailable);

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
        {/* Template presets */}
        <div>
          <span style={labelStyle}>Start from a template</span>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}
          >
            {TEMPLATES.map((tmpl, i) => {
              const sel = selectedTemplate === i;
              const tColor =
                (theme as unknown as Record<string, string>)[tmpl.color] ||
                theme.textMuted;
              const TIcon = tmpl.icon;
              return (
                <button
                  key={tmpl.name}
                  type="button"
                  onClick={() => handleSelectTemplate(i)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 12px",
                    background: sel ? `${tColor}18` : theme.bgBase,
                    border: sel
                      ? `2px solid ${tColor}`
                      : `2px solid ${theme.borderStrong}`,
                    borderRadius: theme.borderRadiusSm,
                    cursor: "pointer",
                    transition: `all 0.15s ${theme.easeSpring}`,
                    boxShadow: sel ? theme.shadowChunky : "none",
                    textAlign: "left",
                  }}
                >
                  <TIcon size={16} color={tColor} strokeWidth={2.5} />
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 1 }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        fontFamily: theme.fontHeading,
                        color: sel ? tColor : theme.textPrimary,
                      }}
                    >
                      {tmpl.name}
                    </span>
                    <span
                      style={{
                        fontSize: 9,
                        fontFamily: theme.fontBody,
                        color: theme.textMuted,
                        lineHeight: 1.3,
                      }}
                    >
                      {tmpl.prompt.slice(0, 50)}...
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

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
          <span style={labelStyle}>Engine</span>
          <div
            style={{
              marginBottom: 10,
              padding: "10px 12px",
              background: `${theme.sapphire}14`,
              border: `2px solid ${theme.sapphire}44`,
              borderRadius: theme.borderRadiusSm,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                fontFamily: theme.fontHeading,
                color: theme.textPrimary,
              }}
            >
              Claude Code
            </span>
            <span
              style={{
                fontSize: 10,
                fontFamily: theme.fontBody,
                color: claudeAvailable ? theme.textMuted : theme.peach,
                fontWeight: 600,
              }}
            >
              {claudeAvailable ? "Detected" : "Not detected"}
            </span>
          </div>

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
            <option value="bypassPermissions">
              Bypass Permissions (auto-approve all)
            </option>
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

        {!claudeAvailable && enginesLoaded && (
          <div
            style={{
              padding: "8px 12px",
              background: theme.goldLight,
              border: `2px solid ${theme.gold}`,
              borderRadius: theme.borderRadiusSm,
              color: theme.textPrimary,
              fontSize: 12,
              fontFamily: theme.fontBody,
            }}
          >
            Claude Code is not installed on this machine.
          </div>
        )}
      </div>
    </Dialog>
  );
}
