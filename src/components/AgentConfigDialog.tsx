import { useState, useEffect } from "react";
import { Settings, RotateCw, AlertTriangle, FolderPlus } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import type { Agent } from "../types/agent";
import { useThemeStore } from "../store/themeStore";
import { toast } from "../store/toastStore";
import { Dialog } from "./ui/Dialog";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Textarea } from "./ui/Textarea";

const PERMISSION_MODES = [
  { value: "bypassPermissions", label: "Bypass Permissions" },
  { value: "plan", label: "Plan Mode" },
  { value: "autoEdit", label: "Auto Edit" },
  { value: "default", label: "Default" },
  { value: "dangerouslySkipPermissions", label: "Skip All (Dangerous)" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  agent: Agent;
}

export function AgentConfigDialog({ open, onClose, agent }: Props) {
  const theme = useThemeStore((s) => s.current);
  const config = agent.config;

  const [systemPrompt, setSystemPrompt] = useState(config.append_system_prompt || "");
  const [maxTurns, setMaxTurns] = useState(config.max_turns?.toString() || "");
  const [maxBudget, setMaxBudget] = useState(config.max_budget_usd?.toString() || "");
  const [permissionMode, setPermissionMode] = useState(config.permission_mode);
  const [allowedTools, setAllowedTools] = useState(config.allowed_tools?.join(", ") || "");
  const [disallowedTools, setDisallowedTools] = useState(config.disallowed_tools?.join(", ") || "");
  const [additionalDirs, setAdditionalDirs] = useState<string[]>(config.additional_dirs || []);
  const [model, setModel] = useState(config.model || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setSystemPrompt(config.append_system_prompt || "");
      setMaxTurns(config.max_turns?.toString() || "");
      setMaxBudget(config.max_budget_usd?.toString() || "");
      setPermissionMode(config.permission_mode);
      setAllowedTools(config.allowed_tools?.join(", ") || "");
      setDisallowedTools(config.disallowed_tools?.join(", ") || "");
      setAdditionalDirs(config.additional_dirs || []);
      setModel(config.model || "");
    }
  }, [open]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await invoke("update_agent_config", {
        agentId: agent.id,
        appendSystemPrompt: systemPrompt || null,
        maxTurns: maxTurns ? parseInt(maxTurns, 10) : null,
        maxBudgetUsd: maxBudget ? parseFloat(maxBudget) : null,
        permissionMode: permissionMode !== config.permission_mode ? permissionMode : null,
        allowedTools: allowedTools
          ? allowedTools.split(",").map((s) => s.trim()).filter(Boolean)
          : null,
        disallowedTools: disallowedTools
          ? disallowedTools.split(",").map((s) => s.trim()).filter(Boolean)
          : null,
        additionalDirs: additionalDirs.length > 0 ? additionalDirs : null,
        model: model !== (config.model || "") ? model : null,
        systemPrompt: null,
      });
      toast.success("Config updated — agent restarting");
      onClose();
    } catch (err) {
      toast.error(`Failed to update config: ${String(err)}`);
    }
    setSaving(false);
  };

  const handleAddDir = async () => {
    try {
      const result = await openDialog({
        directory: true,
        multiple: false,
        title: "Select additional directory",
      });
      if (result) {
        setAdditionalDirs([...additionalDirs, result as string]);
      }
    } catch {
      // User cancelled
    }
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 700,
    fontFamily: theme.fontHeading,
    color: theme.textSecondary,
    marginBottom: 6,
    display: "flex",
    alignItems: "center",
    gap: 6,
  };

  const restartBadge = (
    <span
      style={{
        fontSize: 9,
        fontWeight: 700,
        padding: "1px 6px",
        background: theme.gold + "22",
        color: theme.gold,
        borderRadius: theme.borderRadiusFull,
        border: `1px solid ${theme.gold}`,
      }}
    >
      restart
    </span>
  );

  const sectionStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      onSubmit={handleSave}
      title="Agent Config"
      description={`Configure ${config.name}`}
      width={520}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={saving}
            icon={<RotateCw size={14} />}
          >
            {saving ? "Saving..." : "Save & Restart"}
          </Button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Warning */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px",
            background: theme.gold + "15",
            borderRadius: theme.borderRadiusSm,
            border: `1.5px solid ${theme.gold}40`,
            fontSize: 11,
            color: theme.gold,
            fontWeight: 600,
            fontFamily: theme.fontBody,
          }}
        >
          <AlertTriangle size={13} />
          Changes will restart the agent with the same session
        </div>

        {/* Model */}
        <div style={sectionStyle}>
          <label style={labelStyle}>Model {restartBadge}</label>
          <Input
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="e.g. claude-sonnet-4-5-20250514"
            style={{ fontSize: 12, fontFamily: theme.fontCode }}
          />
        </div>

        {/* System prompt */}
        <div style={sectionStyle}>
          <label style={labelStyle}>Append System Prompt {restartBadge}</label>
          <Textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="Additional instructions appended to the system prompt..."
            rows={3}
            style={{ fontSize: 12 }}
          />
        </div>

        {/* Max turns & budget */}
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ ...sectionStyle, flex: 1 }}>
            <label style={labelStyle}>Max Turns {restartBadge}</label>
            <Input
              type="number"
              value={maxTurns}
              onChange={(e) => setMaxTurns(e.target.value)}
              placeholder="Unlimited"
              style={{ fontSize: 12 }}
            />
          </div>
          <div style={{ ...sectionStyle, flex: 1 }}>
            <label style={labelStyle}>Max Budget ($) {restartBadge}</label>
            <Input
              type="number"
              value={maxBudget}
              onChange={(e) => setMaxBudget(e.target.value)}
              placeholder="Unlimited"
              style={{ fontSize: 12 }}
              step="0.10"
            />
          </div>
        </div>

        {/* Permission mode */}
        <div style={sectionStyle}>
          <label style={labelStyle}>Permission Mode {restartBadge}</label>
          <select
            value={permissionMode}
            onChange={(e) => setPermissionMode(e.target.value)}
            style={{
              padding: "10px 14px",
              background: theme.bgBase,
              border: `2px solid ${theme.borderStrong}`,
              borderRadius: theme.borderRadiusSm,
              color: theme.textPrimary,
              fontSize: 12,
              fontFamily: theme.fontBody,
              fontWeight: 600,
              outline: "none",
              cursor: "pointer",
            }}
          >
            {PERMISSION_MODES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {/* Allowed tools */}
        <div style={sectionStyle}>
          <label style={labelStyle}>Allowed Tools {restartBadge}</label>
          <Input
            value={allowedTools}
            onChange={(e) => setAllowedTools(e.target.value)}
            placeholder="Comma-separated: Read, Write, Bash, ..."
            style={{ fontSize: 12, fontFamily: theme.fontCode }}
          />
        </div>

        {/* Disallowed tools */}
        <div style={sectionStyle}>
          <label style={labelStyle}>Disallowed Tools {restartBadge}</label>
          <Input
            value={disallowedTools}
            onChange={(e) => setDisallowedTools(e.target.value)}
            placeholder="Comma-separated: WebFetch, ..."
            style={{ fontSize: 12, fontFamily: theme.fontCode }}
          />
        </div>

        {/* Additional dirs */}
        <div style={sectionStyle}>
          <label style={labelStyle}>Additional Directories {restartBadge}</label>
          {additionalDirs.map((dir, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 10px",
                background: theme.bgBase,
                borderRadius: theme.borderRadiusSm,
                border: `1.5px solid ${theme.borderColor}`,
                fontSize: 11,
                fontFamily: theme.fontCode,
                color: theme.textSecondary,
              }}
            >
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>
                {dir}
              </span>
              <button
                onClick={() => setAdditionalDirs(additionalDirs.filter((_, j) => j !== i))}
                style={{
                  background: "none",
                  border: "none",
                  color: theme.peach,
                  cursor: "pointer",
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                Remove
              </button>
            </div>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleAddDir}
            icon={<FolderPlus size={12} />}
            style={{ alignSelf: "flex-start", fontSize: 11, color: theme.teal }}
          >
            Add directory
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
