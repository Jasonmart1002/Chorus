import { useEffect, useState } from "react";
import {
  Server,
  Plus,
  Search,
  Trash2,
  RefreshCw,
  Loader2,
  Globe,
  Terminal,
} from "lucide-react";
import { useAgentStore } from "../../store/agentStore";
import { useMcpStore } from "../../store/mcpStore";
import { basename } from "../../lib/platform";
import { useThemeStore } from "../../store/themeStore";
import { PASTEL_KEYS } from "../../lib/theme";
import { IconButton } from "../ui/IconButton";
import { Button } from "../ui/Button";
import { AddMcpDialog } from "../AddMcpDialog";

export function McpView() {
  const servers = useMcpStore((s) => s.servers);
  const loading = useMcpStore((s) => s.loading);
  const fetchServers = useMcpStore((s) => s.fetchServers);
  const removeServer = useMcpStore((s) => s.removeServer);
  const detectEngines = useAgentStore((s) => s.detectEngines);
  const selectedAgentId = useAgentStore((s) => s.selectedAgentId);
  const agents = useAgentStore((s) => s.agents);
  const theme = useThemeStore((s) => s.current);

  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [claudeAvailable, setClaudeAvailable] = useState<boolean | null>(null);

  const selectedAgent = selectedAgentId ? agents[selectedAgentId] : null;
  const projectCwd = selectedAgent?.config.cwd;

  useEffect(() => {
    let cancelled = false;

    detectEngines()
      .then((engines) => {
        if (cancelled) return;
        const available = engines.some(
          (engine) => engine.engine === "claude" && engine.available,
        );
        setClaudeAvailable(available);
        if (available) {
          fetchServers(projectCwd);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setClaudeAvailable(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [detectEngines, fetchServers, projectCwd]);

  const filtered = servers.filter(
    (s) =>
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.command.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px 24px 12px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          borderBottom: `2px solid ${theme.borderColor}`,
          background: theme.bgSidebar,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: theme.borderRadiusSm,
            background: theme.sapphire + "22",
            border: `2px solid ${theme.sapphire}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: theme.shadowChunky,
          }}
        >
          <Server size={18} color={theme.sapphire} />
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 16,
              fontWeight: 800,
              fontFamily: theme.fontHeading,
              color: theme.textPrimary,
              letterSpacing: "-0.02em",
            }}
          >
            MCP Servers
          </div>
          <div
            style={{
              fontSize: 11,
              color: theme.textMuted,
              fontFamily: theme.fontBody,
              fontWeight: 500,
            }}
          >
            {projectCwd
              ? `${servers.length} server${servers.length !== 1 ? "s" : ""} for ${basename(projectCwd)}`
              : `${servers.length} user-level server${servers.length !== 1 ? "s" : ""}`}
          </div>
        </div>
        <IconButton
          icon={
            loading ? (
              <Loader2
                size={14}
                style={{ animation: "spin 1s linear infinite" }}
              />
            ) : (
              <RefreshCw size={14} />
            )
          }
          tooltip="Refresh"
          onClick={() => fetchServers(projectCwd)}
          disabled={claudeAvailable === false}
          hoverColor={theme.sapphire}
        />
        <Button
          variant="primary"
          size="sm"
          onClick={() => setShowAdd(true)}
          disabled={claudeAvailable === false}
          icon={<Plus size={13} />}
          style={{
            fontSize: 12,
            fontWeight: 700,
            fontFamily: theme.fontHeading,
            borderRadius: theme.borderRadiusSm,
          }}
        >
          Add Server
        </Button>
      </div>

      {/* Search */}
      <div style={{ padding: "10px 24px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: theme.bgBase,
            borderRadius: theme.borderRadiusSm,
            padding: "7px 10px",
            border: `2px solid ${theme.borderStrong}`,
            boxShadow: theme.shadowPress,
          }}
        >
          <Search size={13} color={theme.textMuted} />
          <input
            type="text"
            placeholder="Search servers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              background: "transparent",
              border: "none",
              outline: "none",
              color: theme.textPrimary,
              fontSize: 12,
              width: "100%",
              fontFamily: theme.fontBody,
              fontWeight: 500,
            }}
          />
        </div>
      </div>

      {/* Server list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 24px 24px" }}>
        {claudeAvailable === false ? (
          <div
            style={{
              padding: 40,
              textAlign: "center",
              color: theme.textMuted,
              fontSize: 13,
              fontFamily: theme.fontBody,
            }}
          >
            Claude Code is required to manage MCP servers.
          </div>
        ) : loading && servers.length === 0 ? (
          <div
            style={{ padding: 40, textAlign: "center", color: theme.textMuted }}
          >
            <Loader2
              size={24}
              style={{ animation: "spin 1s linear infinite", marginBottom: 8 }}
            />
            <div style={{ fontSize: 13 }}>Loading servers...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div
            style={{
              padding: 40,
              textAlign: "center",
              color: theme.textMuted,
              fontSize: 13,
              fontFamily: theme.fontBody,
            }}
          >
            {search
              ? "No matching servers"
              : "No MCP servers configured. Add one to get started."}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.map((server, i) => {
              const pastelKey = PASTEL_KEYS[i % PASTEL_KEYS.length];
              const pastelColor = theme[pastelKey];
              const isStdio =
                server.transport === "stdio" ||
                !server.transport.includes("sse");
              return (
                <div
                  key={`${server.name}-${server.scope}`}
                  style={{
                    padding: "12px 16px",
                    background: pastelColor + "15",
                    border: `2px solid ${theme.borderStrong}`,
                    borderRadius: theme.borderRadiusSm,
                    boxShadow: theme.shadowChunky,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    animation: `springIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 0.04}s backwards`,
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    {isStdio ? (
                      <Terminal size={14} color={theme.teal} />
                    ) : (
                      <Globe size={14} color={theme.sapphire} />
                    )}
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        fontFamily: theme.fontHeading,
                        color: theme.textPrimary,
                        flex: 1,
                      }}
                    >
                      {server.name}
                    </span>
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        padding: "2px 8px",
                        background:
                          server.scope === "project"
                            ? theme.teal + "22"
                            : theme.lavender + "22",
                        color:
                          server.scope === "project"
                            ? theme.teal
                            : theme.lavender,
                        borderRadius: theme.borderRadiusFull,
                        border: `1px solid ${server.scope === "project" ? theme.teal : theme.lavender}`,
                        textTransform: "uppercase",
                      }}
                    >
                      {server.scope || "user"}
                    </span>
                    <IconButton
                      icon={<Trash2 size={12} />}
                      tooltip="Remove server"
                      onClick={() =>
                        removeServer(
                          server.name,
                          server.scope || "user",
                          projectCwd,
                        )
                      }
                      hoverColor={theme.peach}
                      size="sm"
                    />
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      fontFamily: theme.fontCode,
                      color: theme.textMuted,
                      fontWeight: 500,
                      padding: "4px 8px",
                      background: theme.bgBase + "80",
                      borderRadius: theme.borderRadiusSm,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {server.command}
                    {server.args?.length > 0 && ` ${server.args.join(" ")}`}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showAdd && (
        <AddMcpDialog
          open={showAdd}
          onClose={() => setShowAdd(false)}
          projectCwd={projectCwd}
        />
      )}
    </div>
  );
}
