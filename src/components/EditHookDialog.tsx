import { useState, useEffect } from "react";
import { Save } from "lucide-react";
import type { HookEntry, HookEventName, HookAction } from "../types/hooks";
import { useThemeStore } from "../store/themeStore";
import { Dialog } from "./ui/Dialog";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";

const HOOK_EVENTS: HookEventName[] = [
  "PreToolUse",
  "PostToolUse",
  "Notification",
  "Stop",
  "SubagentStop",
];

interface Props {
  open: boolean;
  onClose: () => void;
  hook?: HookEntry;
  onSave: (hook: HookEntry) => void;
}

export function EditHookDialog({ open, onClose, hook, onSave }: Props) {
  const theme = useThemeStore((s) => s.current);

  const [eventType, setEventType] = useState<HookEventName>(hook?.type || "PreToolUse");
  const [matcher, setMatcher] = useState(hook?.matcher || "");
  const [actionType, setActionType] = useState<"command" | "http">(
    hook?.hooks?.[0]?.type || "command"
  );
  const [command, setCommand] = useState(hook?.hooks?.[0]?.command || "");
  const [url, setUrl] = useState(hook?.hooks?.[0]?.url || "");
  const [timeout, setTimeout_] = useState(
    hook?.hooks?.[0]?.timeout?.toString() || ""
  );

  useEffect(() => {
    if (open && hook) {
      setEventType(hook.type);
      setMatcher(hook.matcher || "");
      setActionType(hook.hooks?.[0]?.type || "command");
      setCommand(hook.hooks?.[0]?.command || "");
      setUrl(hook.hooks?.[0]?.url || "");
      setTimeout_(hook.hooks?.[0]?.timeout?.toString() || "");
    } else if (open) {
      setEventType("PreToolUse");
      setMatcher("");
      setActionType("command");
      setCommand("");
      setUrl("");
      setTimeout_("");
    }
  }, [open, hook]);

  const handleSave = () => {
    const action: HookAction = { type: actionType };
    if (actionType === "command") {
      action.command = command;
    } else {
      action.url = url;
    }
    if (timeout) {
      action.timeout = parseInt(timeout, 10);
    }
    onSave({
      type: eventType,
      matcher: matcher || undefined,
      hooks: [action],
    });
    onClose();
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
      title={hook ? "Edit Hook" : "Add Hook"}
      width={460}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={actionType === "command" ? !command.trim() : !url.trim()}
            icon={<Save size={14} />}
          >
            Save
          </Button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={labelStyle}>Event</label>
          <select
            value={eventType}
            onChange={(e) => setEventType(e.target.value as HookEventName)}
            style={{
              width: "100%",
              padding: "10px 14px",
              background: theme.bgBase,
              border: `2px solid ${theme.borderStrong}`,
              borderRadius: theme.borderRadiusSm,
              color: theme.textPrimary,
              fontSize: 12,
              fontFamily: theme.fontBody,
              fontWeight: 600,
              outline: "none",
            }}
          >
            {HOOK_EVENTS.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={labelStyle}>Matcher (optional)</label>
          <Input
            value={matcher}
            onChange={(e) => setMatcher(e.target.value)}
            placeholder="e.g. Bash, Write, Read"
            style={{ fontSize: 12, fontFamily: theme.fontCode }}
          />
        </div>

        <div>
          <label style={labelStyle}>Hook Type</label>
          <div style={{ display: "flex", gap: 8 }}>
            {(["command", "http"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setActionType(t)}
                style={{
                  padding: "6px 16px",
                  background: actionType === t ? theme.teal + "22" : theme.bgBase,
                  border: `2px solid ${actionType === t ? theme.teal : theme.borderColor}`,
                  borderRadius: theme.borderRadiusSm,
                  color: actionType === t ? theme.teal : theme.textSecondary,
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: theme.fontHeading,
                  cursor: "pointer",
                  textTransform: "capitalize",
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {actionType === "command" ? (
          <div>
            <label style={labelStyle}>Command</label>
            <Input
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="e.g. /usr/local/bin/my-hook.sh"
              style={{ fontSize: 12, fontFamily: theme.fontCode }}
            />
          </div>
        ) : (
          <div>
            <label style={labelStyle}>URL</label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/hook"
              style={{ fontSize: 12, fontFamily: theme.fontCode }}
            />
          </div>
        )}

        <div>
          <label style={labelStyle}>Timeout (ms, optional)</label>
          <Input
            type="number"
            value={timeout}
            onChange={(e) => setTimeout_(e.target.value)}
            placeholder="Default"
            style={{ fontSize: 12, width: 140 }}
          />
        </div>
      </div>
    </Dialog>
  );
}
