import { useState, useEffect, useRef } from "react";
import { FolderOpen } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { useAutomationsStore } from "../../store/automationsStore";
import { useAgentStore } from "../../store/agentStore";
import { useThemeStore } from "../../store/themeStore";
import { basename } from "../../lib/platform";
import { Dialog } from "../ui/Dialog";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { IconButton } from "../ui/IconButton";
import type {
  ScheduleFrequency,
  DayOfWeek,
  AutomationSchedule,
  AutomationTarget,
} from "../../types/automations";

const ALL_DAYS: DayOfWeek[] = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const FREQUENCIES: { label: string; value: ScheduleFrequency }[] = [
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
  { label: "Custom", value: "custom" },
];

interface Props {
  editingId: string | null;
  onClose: () => void;
}

export function CreateAutomationDialog({ editingId, onClose }: Props) {
  const theme = useThemeStore((s) => s.current);
  const createAutomation = useAutomationsStore((s) => s.createAutomation);
  const updateAutomation = useAutomationsStore((s) => s.updateAutomation);
  const automations = useAutomationsStore((s) => s.automations);
  const agents = useAgentStore((s) => s.agents);

  const editing = editingId
    ? automations.find((a) => a.id === editingId)
    : null;

  const [name, setName] = useState(editing?.name || "");
  const [prompt, setPrompt] = useState(editing?.prompt || "");
  const [frequency, setFrequency] = useState<ScheduleFrequency>(
    editing?.schedule.frequency || "daily"
  );
  const [days, setDays] = useState<DayOfWeek[]>(
    editing?.schedule.days || []
  );
  const [time, setTime] = useState(editing?.schedule.time || "09:00");
  const [customMinutes, setCustomMinutes] = useState(() => {
    const raw = editing?.schedule.custom_interval_minutes ?? 60;
    if (raw >= 60 && raw % 60 === 0) return raw / 60; // show as hours if editing in hours
    return raw;
  });
  const [targetMode, setTargetMode] = useState<"existing" | "new">(
    editing?.target.agent_id ? "existing" : "new"
  );
  const [targetAgentId, setTargetAgentId] = useState(
    editing?.target.agent_id || ""
  );
  const [newAgentName, setNewAgentName] = useState(
    editing?.target.agent_name || ""
  );
  const [newAgentCwd, setNewAgentCwd] = useState(
    editing?.target.agent_cwd || ""
  );
  const [skipPermissions, setSkipPermissions] = useState(
    editing?.skip_permissions ?? false
  );
  const [customUnit, setCustomUnit] = useState<"minutes" | "hours">(
    editing?.schedule.custom_interval_minutes &&
      editing.schedule.custom_interval_minutes >= 60 &&
      editing.schedule.custom_interval_minutes % 60 === 0
      ? "hours"
      : "minutes"
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 200) + "px";
    }
  }, [prompt]);

  const agentList = Object.values(agents).filter(
    (a) => a.status !== "exited"
  );

  const handlePickDir = async () => {
    const selected = await open({ directory: true, multiple: false });
    if (selected && typeof selected === "string") {
      setNewAgentCwd(selected);
      if (!newAgentName) {
        setNewAgentName(basename(selected));
      }
    }
  };

  const toggleDay = (day: DayOfWeek) => {
    setDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = async () => {
    if (!name.trim() || !prompt.trim()) return;

    const schedule: AutomationSchedule = {
      frequency,
      days,
      time,
      custom_interval_minutes:
        frequency === "custom"
          ? customUnit === "hours"
            ? customMinutes * 60
            : customMinutes
          : undefined,
    };

    const target: AutomationTarget =
      targetMode === "existing"
        ? { agent_id: targetAgentId || undefined }
        : {
            agent_name: newAgentName.trim() || undefined,
            agent_cwd: newAgentCwd.trim() || undefined,
          };

    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await updateAutomation(editing.id, {
          name: name.trim(),
          prompt: prompt.trim(),
          schedule,
          target,
          skip_permissions: skipPermissions,
        });
      } else {
        await createAutomation(name.trim(), prompt.trim(), schedule, target, skipPermissions);
      }
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setSaving(false);
    }
  };

  const isReady = !!(
    name.trim() &&
    prompt.trim() &&
    !saving &&
    (targetMode === "existing"
      ? targetAgentId
      : newAgentCwd.trim())
  );

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
      onSubmit={handleSubmit}
      title={editing ? "Edit Automation" : "New Automation"}
      width={500}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            color={theme.gold}
            onClick={handleSubmit}
            disabled={!isReady}
            loading={saving}
          >
            {editing ? "Save" : "Create Automation"}
          </Button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Name */}
        <label style={{ display: "block" }}>
          <span style={labelStyle}>Name</span>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Check for sentry issues"
            autoFocus
          />
        </label>

        {/* Prompt */}
        <label style={{ display: "block" }}>
          <span style={labelStyle}>Prompt</span>
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Check for new Sentry errors in the last hour and summarize them..."
            rows={3}
            style={{
              width: "100%",
              padding: "10px 14px",
              background: theme.bgBase,
              border: `2px solid ${theme.borderStrong}`,
              borderRadius: theme.borderRadiusSm,
              color: theme.textPrimary,
              fontSize: 13,
              fontFamily: theme.fontCode,
              fontWeight: 500,
              outline: "none",
              resize: "none",
              lineHeight: 1.5,
              boxSizing: "border-box",
            }}
          />
        </label>

        {/* Schedule frequency */}
        <label style={{ display: "block" }}>
          <span style={labelStyle}>Schedule</span>
          <select
            value={frequency}
            onChange={(e) =>
              setFrequency(e.target.value as ScheduleFrequency)
            }
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
            {FREQUENCIES.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </label>

        {/* Days of week — shown for daily, weekly & monthly */}
        {(frequency === "daily" || frequency === "weekly" || frequency === "monthly") && (
          <div>
            <span style={labelStyle}>Days</span>
            <div style={{ display: "flex", gap: 5 }}>
              {ALL_DAYS.map((day) => {
                const active = days.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    style={{
                      flex: 1,
                      padding: "7px 0",
                      borderRadius: theme.borderRadiusSm,
                      background: active ? theme.goldLight : theme.bgBase,
                      border: active
                        ? `2px solid ${theme.gold}`
                        : `2px solid ${theme.borderStrong}`,
                      color: active ? theme.textPrimary : theme.textMuted,
                      fontSize: 11,
                      fontWeight: 800,
                      fontFamily: theme.fontHeading,
                      cursor: "pointer",
                      transition: `all 0.15s ${theme.easeSpring}`,
                      transform: active ? "scale(1.05)" : "scale(1)",
                      boxShadow: active ? theme.shadowPress : "none",
                    }}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Time picker — shown for daily/weekly/monthly */}
        {frequency !== "custom" && (
          <label style={{ display: "block" }}>
            <span style={labelStyle}>Time</span>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
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
                boxSizing: "border-box",
              }}
            />
          </label>
        )}

        {/* Custom interval — shown for custom */}
        {frequency === "custom" && (
          <div>
            <span style={labelStyle}>Interval</span>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="number"
                min={1}
                value={customMinutes}
                onChange={(e) =>
                  setCustomMinutes(Math.max(1, parseInt(e.target.value) || 1))
                }
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  background: theme.bgBase,
                  border: `2px solid ${theme.borderStrong}`,
                  borderRadius: theme.borderRadiusSm,
                  color: theme.textPrimary,
                  fontSize: 14,
                  fontFamily: theme.fontBody,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <div
                style={{
                  display: "flex",
                  borderRadius: theme.borderRadiusSm,
                  border: `2px solid ${theme.borderStrong}`,
                  overflow: "hidden",
                  flexShrink: 0,
                }}
              >
                {(["minutes", "hours"] as const).map((unit) => (
                  <button
                    key={unit}
                    type="button"
                    onClick={() => {
                      if (unit === customUnit) return;
                      if (unit === "hours") {
                        setCustomMinutes((prev) =>
                          Math.max(1, Math.round(prev / 60))
                        );
                      } else {
                        setCustomMinutes((prev) => prev * 60);
                      }
                      setCustomUnit(unit);
                    }}
                    style={{
                      padding: "7px 14px",
                      background:
                        customUnit === unit ? theme.goldLight : theme.bgBase,
                      border: "none",
                      borderLeft:
                        unit === "hours"
                          ? `2px solid ${theme.borderStrong}`
                          : "none",
                      color:
                        customUnit === unit
                          ? theme.textPrimary
                          : theme.textMuted,
                      fontSize: 12,
                      fontWeight: 700,
                      fontFamily: theme.fontHeading,
                      cursor: "pointer",
                      transition: `all 0.15s ${theme.easeSpring}`,
                    }}
                  >
                    {unit === "minutes" ? "Min" : "Hr"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Target */}
        <div>
          <span style={labelStyle}>Target</span>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            {(["existing", "new"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setTargetMode(mode)}
                style={{
                  flex: 1,
                  padding: "7px 0",
                  borderRadius: theme.borderRadiusSm,
                  background:
                    targetMode === mode ? theme.goldLight : theme.bgBase,
                  border:
                    targetMode === mode
                      ? `2px solid ${theme.gold}`
                      : `2px solid ${theme.borderStrong}`,
                  color:
                    targetMode === mode
                      ? theme.textPrimary
                      : theme.textMuted,
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: theme.fontHeading,
                  cursor: "pointer",
                  transition: `all 0.15s ${theme.easeSpring}`,
                }}
              >
                {mode === "existing" ? "Existing Agent" : "New Agent"}
              </button>
            ))}
          </div>

          {targetMode === "existing" ? (
            <select
              value={targetAgentId}
              onChange={(e) => setTargetAgentId(e.target.value)}
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
              <option value="">Select an agent...</option>
              {agentList.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.config.name} ({basename(agent.config.cwd)})
                </option>
              ))}
            </select>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <Input
                value={newAgentName}
                onChange={(e) => setNewAgentName(e.target.value)}
                placeholder="Agent name (optional)"
              />
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <Input
                    value={newAgentCwd}
                    onChange={(e) => setNewAgentCwd(e.target.value)}
                    placeholder="/path/to/project"
                  />
                </div>
                <IconButton
                  icon={<FolderOpen size={16} />}
                  tooltip="Browse"
                  onClick={handlePickDir}
                  variant="tinted"
                  tintColor={theme.gold}
                  size="md"
                />
              </div>
            </div>
          )}
        </div>

        {/* Skip permissions toggle */}
        {targetMode === "new" && (
          <div>
            <button
              type="button"
              onClick={() => setSkipPermissions(!skipPermissions)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "100%",
                padding: "10px 14px",
                background: skipPermissions
                  ? `${theme.peach}15`
                  : theme.bgBase,
                border: `2px solid ${skipPermissions ? theme.peach : theme.borderStrong}`,
                borderRadius: theme.borderRadiusSm,
                cursor: "pointer",
                transition: `all 0.15s ${theme.easeSpring}`,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 20,
                  borderRadius: theme.borderRadiusFull,
                  background: skipPermissions ? theme.peach : theme.bgCard,
                  border: `2px solid ${skipPermissions ? theme.peach : theme.borderStrong}`,
                  position: "relative",
                  transition: `all 0.2s ${theme.easeSpring}`,
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    background: skipPermissions
                      ? theme.textOnAccent
                      : theme.textMuted,
                    position: "absolute",
                    top: 2,
                    left: skipPermissions ? 18 : 2,
                    transition: `all 0.2s ${theme.easeSpring}`,
                    boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
                  }}
                />
              </div>
              <div style={{ textAlign: "left" }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    fontFamily: theme.fontHeading,
                    color: skipPermissions
                      ? theme.peach
                      : theme.textSecondary,
                  }}
                >
                  Skip Permissions
                </div>
                <div
                  style={{
                    fontSize: 10,
                    fontFamily: theme.fontBody,
                    color: theme.textMuted,
                    marginTop: 1,
                  }}
                >
                  Run with --dangerously-skip-permissions (no approval prompts)
                </div>
              </div>
            </button>
          </div>
        )}

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
