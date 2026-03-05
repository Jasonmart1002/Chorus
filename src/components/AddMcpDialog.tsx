import { useState } from "react";
import { Plus, X } from "lucide-react";
import { useMcpStore } from "../store/mcpStore";
import { useThemeStore } from "../store/themeStore";
import { Dialog } from "./ui/Dialog";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { IconButton } from "./ui/IconButton";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AddMcpDialog({ open, onClose }: Props) {
  const addServer = useMcpStore((s) => s.addServer);
  const theme = useThemeStore((s) => s.current);

  const [name, setName] = useState("");
  const [transport, setTransport] = useState("stdio");
  const [command, setCommand] = useState("");
  const [args, setArgs] = useState("");
  const [scope, setScope] = useState("user");
  const [envVars, setEnvVars] = useState<{ key: string; value: string }[]>([]);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !command.trim()) return;
    setSaving(true);
    try {
      const envMap: Record<string, string> = {};
      for (const ev of envVars) {
        if (ev.key.trim()) envMap[ev.key.trim()] = ev.value;
      }
      await addServer(
        name.trim(),
        transport,
        command.trim(),
        args ? args.split(/\s+/).filter(Boolean) : [],
        envMap,
        scope
      );
      onClose();
    } catch {
      // error toasted by store
    }
    setSaving(false);
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
      onSubmit={handleSubmit}
      title="Add MCP Server"
      description="Connect to a Model Context Protocol server"
      width={480}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={!name.trim() || !command.trim() || saving}
            icon={<Plus size={14} />}
          >
            {saving ? "Adding..." : "Add Server"}
          </Button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={labelStyle}>Server Name</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="my-server"
            style={{ fontSize: 12 }}
          />
        </div>

        <div>
          <label style={labelStyle}>Transport</label>
          <div style={{ display: "flex", gap: 8 }}>
            {["stdio", "sse"].map((t) => (
              <button
                key={t}
                onClick={() => setTransport(t)}
                style={{
                  padding: "6px 16px",
                  background: transport === t ? theme.sapphire + "22" : theme.bgBase,
                  border: `2px solid ${transport === t ? theme.sapphire : theme.borderColor}`,
                  borderRadius: theme.borderRadiusSm,
                  color: transport === t ? theme.sapphire : theme.textSecondary,
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: theme.fontHeading,
                  cursor: "pointer",
                }}
              >
                {t.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={labelStyle}>
            {transport === "sse" ? "URL" : "Command"}
          </label>
          <Input
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder={
              transport === "sse"
                ? "https://example.com/mcp"
                : "npx -y @modelcontextprotocol/server-filesystem"
            }
            style={{ fontSize: 12, fontFamily: theme.fontCode }}
          />
        </div>

        {transport === "stdio" && (
          <div>
            <label style={labelStyle}>Arguments</label>
            <Input
              value={args}
              onChange={(e) => setArgs(e.target.value)}
              placeholder="Space-separated arguments"
              style={{ fontSize: 12, fontFamily: theme.fontCode }}
            />
          </div>
        )}

        <div>
          <label style={labelStyle}>Scope</label>
          <div style={{ display: "flex", gap: 8 }}>
            {["user", "project"].map((s) => (
              <button
                key={s}
                onClick={() => setScope(s)}
                style={{
                  padding: "6px 16px",
                  background: scope === s ? theme.teal + "22" : theme.bgBase,
                  border: `2px solid ${scope === s ? theme.teal : theme.borderColor}`,
                  borderRadius: theme.borderRadiusSm,
                  color: scope === s ? theme.teal : theme.textSecondary,
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: theme.fontHeading,
                  cursor: "pointer",
                  textTransform: "capitalize",
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Env vars */}
        <div>
          <label style={labelStyle}>Environment Variables</label>
          {envVars.map((ev, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
              <Input
                value={ev.key}
                onChange={(e) => {
                  const updated = [...envVars];
                  updated[i] = { ...ev, key: e.target.value };
                  setEnvVars(updated);
                }}
                placeholder="KEY"
                style={{ width: 130, fontSize: 11, fontFamily: theme.fontCode }}
              />
              <span style={{ color: theme.textMuted }}>=</span>
              <div style={{ flex: 1 }}>
                <Input
                  value={ev.value}
                  onChange={(e) => {
                    const updated = [...envVars];
                    updated[i] = { ...ev, value: e.target.value };
                    setEnvVars(updated);
                  }}
                  placeholder="value"
                  style={{ fontSize: 11, fontFamily: theme.fontCode }}
                />
              </div>
              <IconButton
                icon={<X size={13} />}
                tooltip="Remove"
                onClick={() => setEnvVars(envVars.filter((_, j) => j !== i))}
                hoverColor={theme.peach}
                size="sm"
              />
            </div>
          ))}
          <button
            onClick={() => setEnvVars([...envVars, { key: "", value: "" }])}
            style={{
              background: "none",
              border: "none",
              color: theme.teal,
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 600,
              fontFamily: theme.fontBody,
              padding: "2px 0",
            }}
          >
            + Add env var
          </button>
        </div>
      </div>
    </Dialog>
  );
}
