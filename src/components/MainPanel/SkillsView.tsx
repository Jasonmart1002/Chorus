import { useEffect, useMemo, useState } from "react";
import {
  Blocks,
  RefreshCw,
  Search,
  BookOpen,
  Terminal,
  ChevronDown,
  ChevronRight,
  Loader,
  User,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useSkillsStore } from "../../store/skillsStore";
import { useThemeStore } from "../../store/themeStore";
import { PASTEL_KEYS } from "../../lib/theme";
import { IconButton } from "../ui/IconButton";
import type { PluginInfo, SkillInfo, CommandInfo } from "../../types/skills";

function SkillRow({
  skill,
  expanded,
  onToggle,
}: {
  skill: SkillInfo;
  expanded: boolean;
  onToggle: () => void;
}) {
  const theme = useThemeStore((s) => s.current);
  const [hovered, setHovered] = useState(false);

  return (
    <div>
      <div
        onClick={onToggle}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 10px",
          borderRadius: theme.borderRadiusSm,
          background: hovered ? theme.hoverOverlay : `${theme.bgBase}66`,
          border: `1.5px solid ${expanded ? theme.lavender : theme.borderColor}`,
          cursor: "pointer",
          transition: `all 0.15s ${theme.easeSpring}`,
          transform: hovered ? "translateX(2px)" : "none",
        }}
      >
        <BookOpen
          size={13}
          color={theme.lavender}
          strokeWidth={2.2}
          style={{ flexShrink: 0 }}
        />
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            fontFamily: theme.fontCode,
            color: theme.textPrimary,
            flexShrink: 0,
          }}
        >
          {skill.name}
        </span>
        <span
          style={{
            fontSize: 11,
            color: theme.textMuted,
            fontFamily: theme.fontBody,
            fontWeight: 500,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
            minWidth: 0,
          }}
        >
          {skill.description}
        </span>
        {expanded ? (
          <ChevronDown size={12} color={theme.textMuted} style={{ flexShrink: 0 }} />
        ) : (
          <ChevronRight size={12} color={theme.textMuted} style={{ flexShrink: 0 }} />
        )}
      </div>
    </div>
  );
}

function CommandRow({
  command,
  expanded,
  onToggle,
}: {
  command: CommandInfo;
  expanded: boolean;
  onToggle: () => void;
}) {
  const theme = useThemeStore((s) => s.current);
  const [hovered, setHovered] = useState(false);

  return (
    <div>
      <div
        onClick={onToggle}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 10px",
          borderRadius: theme.borderRadiusSm,
          background: hovered ? theme.hoverOverlay : `${theme.bgBase}66`,
          border: `1.5px solid ${expanded ? theme.mint : theme.borderColor}`,
          cursor: "pointer",
          transition: `all 0.15s ${theme.easeSpring}`,
          transform: hovered ? "translateX(2px)" : "none",
        }}
      >
        <Terminal
          size={13}
          color={theme.mint}
          strokeWidth={2.2}
          style={{ flexShrink: 0 }}
        />
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            fontFamily: theme.fontCode,
            color: theme.textPrimary,
            flexShrink: 0,
          }}
        >
          /{command.name}
        </span>
        {command.argument_hint && (
          <span
            style={{
              fontSize: 10,
              fontFamily: theme.fontCode,
              color: theme.textMuted,
              fontWeight: 500,
              fontStyle: "italic",
              flexShrink: 0,
            }}
          >
            {command.argument_hint}
          </span>
        )}
        <span
          style={{
            fontSize: 11,
            color: theme.textMuted,
            fontFamily: theme.fontBody,
            fontWeight: 500,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
            minWidth: 0,
          }}
        >
          {command.description}
        </span>
        {expanded ? (
          <ChevronDown size={12} color={theme.textMuted} style={{ flexShrink: 0 }} />
        ) : (
          <ChevronRight size={12} color={theme.textMuted} style={{ flexShrink: 0 }} />
        )}
      </div>
      {expanded && command.allowed_tools.length > 0 && (
        <div
          style={{
            padding: "8px 12px",
            marginTop: 4,
            background: `${theme.bgBase}88`,
            borderRadius: theme.borderRadiusSm,
            border: `1.5px solid ${theme.borderColor}`,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              fontFamily: theme.fontHeading,
              color: theme.textMuted,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            Allowed tools
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {command.allowed_tools.map((tool) => (
              <span
                key={tool}
                style={{
                  padding: "2px 8px",
                  borderRadius: theme.borderRadiusFull,
                  background: `${theme.mint}22`,
                  border: `1px solid ${theme.mint}44`,
                  fontSize: 10,
                  fontWeight: 600,
                  fontFamily: theme.fontCode,
                  color: theme.textSecondary,
                }}
              >
                {tool}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PluginCard({
  plugin,
  index,
  expanded,
  onToggle,
}: {
  plugin: PluginInfo;
  index: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const theme = useThemeStore((s) => s.current);
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);
  const [expandedCommand, setExpandedCommand] = useState<string | null>(null);

  const pastelKey = PASTEL_KEYS[index % PASTEL_KEYS.length];
  const pastelColor = theme[pastelKey];

  return (
    <div
      style={{
        background: pastelColor,
        border: `2.5px solid ${theme.borderStrong}`,
        borderRadius: theme.borderRadiusSm,
        boxShadow: theme.shadowChunky,
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        animation: `springIn 0.35s ${theme.easeSpring} ${index * 0.05}s backwards`,
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 8,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
            }}
            onClick={onToggle}
          >
            {expanded ? (
              <ChevronDown size={14} color={theme.textPrimary} strokeWidth={2.5} />
            ) : (
              <ChevronRight size={14} color={theme.textPrimary} strokeWidth={2.5} />
            )}
            <div
              style={{
                fontSize: 16,
                fontWeight: 800,
                fontFamily: theme.fontHeading,
                color: theme.textPrimary,
                letterSpacing: "-0.02em",
                lineHeight: 1.2,
              }}
            >
              {plugin.name}
            </div>
          </div>
          {plugin.author && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                marginTop: 4,
                marginLeft: 22,
              }}
            >
              <User size={10} color={theme.textMuted} strokeWidth={2} />
              <span
                style={{
                  fontSize: 11,
                  color: theme.textMuted,
                  fontFamily: theme.fontBody,
                  fontWeight: 600,
                }}
              >
                {plugin.author.name}
              </span>
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
          <span
            style={{
              padding: "2px 8px",
              borderRadius: theme.borderRadiusFull,
              background: `${theme.lavender}33`,
              border: `2px solid ${theme.borderStrong}`,
              fontSize: 10,
              fontWeight: 800,
              fontFamily: theme.fontHeading,
              color: theme.textSecondary,
              letterSpacing: "0.02em",
            }}
          >
            v{plugin.version}
          </span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "2px 8px",
              borderRadius: theme.borderRadiusFull,
              background: plugin.enabled ? `${theme.mint}33` : `${theme.textMuted}22`,
              border: `2px solid ${theme.borderStrong}`,
              fontSize: 10,
              fontWeight: 800,
              fontFamily: theme.fontHeading,
              color: plugin.enabled ? theme.mint : theme.textMuted,
              letterSpacing: "0.02em",
            }}
          >
            {plugin.enabled ? (
              <CheckCircle2 size={10} strokeWidth={2.5} />
            ) : (
              <XCircle size={10} strokeWidth={2.5} />
            )}
            {plugin.enabled ? "Enabled" : "Disabled"}
          </span>
        </div>
      </div>

      {/* Description */}
      <div
        style={{
          fontSize: 13,
          color: theme.textSecondary,
          fontFamily: theme.fontBody,
          lineHeight: 1.55,
          fontWeight: 500,
          marginLeft: 22,
        }}
      >
        {plugin.description}
      </div>

      {/* Expanded content */}
      {expanded && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginLeft: 22 }}>
          {/* Skills section */}
          {plugin.skills.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  fontFamily: theme.fontHeading,
                  color: theme.textMuted,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  marginBottom: 6,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <BookOpen size={10} color={theme.lavender} strokeWidth={2.5} />
                Skills ({plugin.skills.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {plugin.skills.map((skill) => (
                  <SkillRow
                    key={skill.file_path}
                    skill={skill}
                    expanded={expandedSkill === skill.file_path}
                    onToggle={() =>
                      setExpandedSkill(
                        expandedSkill === skill.file_path ? null : skill.file_path
                      )
                    }
                  />
                ))}
              </div>
            </div>
          )}

          {/* Commands section */}
          {plugin.commands.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  fontFamily: theme.fontHeading,
                  color: theme.textMuted,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  marginBottom: 6,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Terminal size={10} color={theme.mint} strokeWidth={2.5} />
                Commands ({plugin.commands.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {plugin.commands.map((cmd) => (
                  <CommandRow
                    key={cmd.file_path}
                    command={cmd}
                    expanded={expandedCommand === cmd.file_path}
                    onToggle={() =>
                      setExpandedCommand(
                        expandedCommand === cmd.file_path ? null : cmd.file_path
                      )
                    }
                  />
                ))}
              </div>
            </div>
          )}

          {/* Metadata footer */}
          <div
            style={{
              display: "flex",
              gap: 16,
              paddingTop: 8,
              borderTop: `1.5px solid ${theme.borderColor}`,
              fontSize: 10,
              fontFamily: theme.fontBody,
              color: theme.textMuted,
              fontWeight: 500,
            }}
          >
            {plugin.installed_at && (
              <span>
                Installed{" "}
                {new Date(plugin.installed_at).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </span>
            )}
            {plugin.last_updated && plugin.last_updated !== plugin.installed_at && (
              <span>
                Updated{" "}
                {new Date(plugin.last_updated).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Collapsed summary counts */}
      {!expanded && (plugin.skills.length > 0 || plugin.commands.length > 0) && (
        <div
          style={{
            display: "flex",
            gap: 8,
            marginLeft: 22,
          }}
        >
          {plugin.skills.length > 0 && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                fontSize: 10,
                fontWeight: 700,
                fontFamily: theme.fontHeading,
                color: theme.textMuted,
              }}
            >
              <BookOpen size={10} color={theme.lavender} strokeWidth={2.5} />
              {plugin.skills.length} skill{plugin.skills.length !== 1 ? "s" : ""}
            </span>
          )}
          {plugin.commands.length > 0 && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                fontSize: 10,
                fontWeight: 700,
                fontFamily: theme.fontHeading,
                color: theme.textMuted,
              }}
            >
              <Terminal size={10} color={theme.mint} strokeWidth={2.5} />
              {plugin.commands.length} command{plugin.commands.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function SkillsView() {
  const theme = useThemeStore((s) => s.current);
  const data = useSkillsStore((s) => s.data);
  const loading = useSkillsStore((s) => s.loading);
  const fetchSkills = useSkillsStore((s) => s.fetchSkills);
  const searchQuery = useSkillsStore((s) => s.searchQuery);
  const setSearchQuery = useSkillsStore((s) => s.setSearchQuery);
  const expandedPluginId = useSkillsStore((s) => s.expandedPluginId);
  const togglePlugin = useSkillsStore((s) => s.togglePlugin);

  useEffect(() => {
    fetchSkills();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredPlugins = useMemo(() => {
    if (!data?.plugins) return [];
    if (!searchQuery) return data.plugins;
    const q = searchQuery.toLowerCase();
    return data.plugins.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.skills.some((s) => s.name.toLowerCase().includes(q)) ||
        p.commands.some((c) => c.name.toLowerCase().includes(q))
    );
  }, [data, searchQuery]);

  // Loading state
  if (loading && !data) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
        }}
      >
        <Loader
          size={24}
          color={theme.sapphire}
          strokeWidth={2.5}
          style={{ animation: "spin 1s linear infinite" }}
        />
      </div>
    );
  }

  // Empty state
  if (data && data.plugins.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
          backgroundImage: theme.dotPattern,
          backgroundSize: "24px 24px",
          position: "relative",
          overflow: "hidden",
          height: "100%",
        }}
      >
        {/* Glow */}
        <div
          style={{
            position: "absolute",
            width: 200,
            height: 200,
            borderRadius: theme.borderRadiusFull,
            background: theme.coolGradient,
            opacity: 0.15,
            filter: "blur(60px)",
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            position: "relative",
            width: 80,
            height: 80,
            borderRadius: theme.borderRadiusXl,
            background: theme.blueLight,
            border: `3px solid ${theme.borderStrong}`,
            boxShadow: theme.shadowChunky,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Blocks size={40} strokeWidth={2} color={theme.sapphire} />
        </div>

        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            fontFamily: theme.fontHeading,
            color: theme.textPrimary,
            textShadow: `2px 2px 0px ${theme.blueLight}`,
            letterSpacing: "-0.02em",
          }}
        >
          No plugins installed
        </div>
        <div
          style={{
            fontSize: 14,
            fontFamily: theme.fontBody,
            color: theme.textSecondary,
            textAlign: "center",
            lineHeight: 1.6,
            maxWidth: 360,
          }}
        >
          Install Claude Code plugins to extend your workflow ~
        </div>
        <kbd
          style={{
            marginTop: 4,
            padding: "6px 16px",
            background: theme.bgCard,
            borderRadius: theme.borderRadiusSm,
            fontSize: 13,
            fontWeight: 600,
            color: theme.textSecondary,
            border: `2px solid ${theme.borderStrong}`,
            boxShadow: theme.shadowChunky,
            fontFamily: theme.fontCode,
            letterSpacing: "0.04em",
          }}
        >
          claude plugins add &lt;name&gt;
        </kbd>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px 20px",
          borderBottom: `2px solid ${theme.borderColor}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: theme.borderRadiusSm,
              background: theme.blueLight,
              border: `2.5px solid ${theme.borderStrong}`,
              boxShadow: theme.shadowChunky,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Blocks size={18} color={theme.sapphire} strokeWidth={2.2} />
          </div>
          <div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 800,
                fontFamily: theme.fontHeading,
                color: theme.textPrimary,
                letterSpacing: "-0.02em",
                lineHeight: 1.2,
              }}
            >
              Skills & Plugins
            </div>
            <div
              style={{
                fontSize: 11,
                color: theme.textMuted,
                fontFamily: theme.fontBody,
                fontWeight: 600,
                marginTop: 2,
              }}
            >
              {data?.plugins.length ?? 0} plugin
              {(data?.plugins.length ?? 0) !== 1 ? "s" : ""} &middot;{" "}
              {data?.total_skills ?? 0} skill
              {(data?.total_skills ?? 0) !== 1 ? "s" : ""} &middot;{" "}
              {data?.total_commands ?? 0} command
              {(data?.total_commands ?? 0) !== 1 ? "s" : ""}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {/* Search input */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: theme.bgCard,
              borderRadius: theme.borderRadiusSm,
              padding: "6px 10px",
              border: `2px solid ${theme.borderStrong}`,
              boxShadow: theme.shadowPress,
              width: 200,
            }}
          >
            <Search
              size={13}
              color={theme.textMuted}
              strokeWidth={2.2}
              style={{ flexShrink: 0 }}
            />
            <input
              type="text"
              placeholder="Search skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
          <IconButton
            icon={
              <RefreshCw
                size={14}
                strokeWidth={2.2}
                style={loading ? { animation: "spin 1s linear infinite" } : undefined}
              />
            }
            tooltip="Refresh"
            onClick={fetchSkills}
            hoverColor={theme.sapphire}
          />
        </div>
      </div>

      {/* Plugin cards */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px 20px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {filteredPlugins.length === 0 && searchQuery ? (
          <div
            style={{
              padding: "40px 12px",
              textAlign: "center",
              fontSize: 13,
              color: theme.textMuted,
              fontFamily: theme.fontBody,
              fontWeight: 600,
            }}
          >
            No matching plugins found ~
          </div>
        ) : (
          filteredPlugins.map((plugin, i) => (
            <PluginCard
              key={plugin.id}
              plugin={plugin}
              index={i}
              expanded={expandedPluginId === plugin.id}
              onToggle={() => togglePlugin(plugin.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
