import { useEffect, useState } from "react";
import {
  Webhook,
  Plus,
  Search,
  RefreshCw,
  Loader2,
  Trash2,
  Pencil,
  FileText,
  BookOpen,
} from "lucide-react";
import { useHooksStore } from "../../store/hooksStore";
import { useAgentStore } from "../../store/agentStore";
import { useThemeStore } from "../../store/themeStore";
import { PASTEL_KEYS } from "../../lib/theme";
import { homeDir } from "../../lib/platform";
import type { HookEntry, HookEventName } from "../../types/hooks";
import { IconButton } from "../ui/IconButton";
import { Button } from "../ui/Button";
import { EditHookDialog } from "../EditHookDialog";
import { EditSkillDialog } from "../EditSkillDialog";

const EVENT_COLORS: Record<HookEventName, string> = {
  PreToolUse: "sapphire",
  PostToolUse: "teal",
  Notification: "gold",
  Stop: "peach",
  SubagentStop: "flamingo",
};

export function HooksView() {
  const hooks = useHooksStore((s) => s.hooks);
  const skills = useHooksStore((s) => s.skills);
  const loading = useHooksStore((s) => s.loading);
  const fetchHooks = useHooksStore((s) => s.fetchHooks);
  const fetchSkills = useHooksStore((s) => s.fetchSkills);
  const saveHooks = useHooksStore((s) => s.saveHooks);
  const theme = useThemeStore((s) => s.current);

  const selectedAgentId = useAgentStore((s) => s.selectedAgentId);
  const agents = useAgentStore((s) => s.agents);
  const selectedAgent = selectedAgentId ? agents[selectedAgentId] : null;
  const cwd = selectedAgent?.config.cwd;

  const [search, setSearch] = useState("");
  const [editHook, setEditHook] = useState<HookEntry | undefined>(undefined);
  const [editHookIndex, setEditHookIndex] = useState(-1);
  const [showEditHook, setShowEditHook] = useState(false);
  const [showEditSkill, setShowEditSkill] = useState(false);
  const [editSkillPath, setEditSkillPath] = useState<string | undefined>();
  const [editSkillName, setEditSkillName] = useState<string | undefined>();
  const [editSkillScope, setEditSkillScope] = useState<"user" | "project">("user");
  const [home, setHome] = useState("");

  useEffect(() => {
    fetchHooks();
    fetchSkills(cwd);
    homeDir().then(setHome);
  }, [cwd]);

  const filteredHooks = hooks.filter(
    (h) =>
      !search ||
      h.type.toLowerCase().includes(search.toLowerCase()) ||
      (h.matcher || "").toLowerCase().includes(search.toLowerCase())
  );

  // Group hooks by event type
  const grouped = new Map<HookEventName, { hook: HookEntry; index: number }[]>();
  filteredHooks.forEach((h, i) => {
    const arr = grouped.get(h.type) || [];
    arr.push({ hook: h, index: i });
    grouped.set(h.type, arr);
  });

  const handleDeleteHook = (index: number) => {
    const updated = hooks.filter((_, i) => i !== index);
    saveHooks(updated, "user");
  };

  const handleSaveHook = (hook: HookEntry) => {
    const updated = [...hooks];
    if (editHookIndex >= 0) {
      updated[editHookIndex] = hook;
    } else {
      updated.push(hook);
    }
    saveHooks(updated, "user");
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
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
            background: theme.flamingo + "22",
            border: `2px solid ${theme.flamingo}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: theme.shadowChunky,
          }}
        >
          <Webhook size={18} color={theme.flamingo} />
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
            Hooks & Skills
          </div>
          <div
            style={{
              fontSize: 11,
              color: theme.textMuted,
              fontFamily: theme.fontBody,
              fontWeight: 500,
            }}
          >
            {hooks.length} hook{hooks.length !== 1 ? "s" : ""} &middot; {skills.length} skill
            {skills.length !== 1 ? "s" : ""}
          </div>
        </div>
        <IconButton
          icon={
            loading ? (
              <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
            ) : (
              <RefreshCw size={14} />
            )
          }
          tooltip="Refresh"
          onClick={() => {
            fetchHooks();
            fetchSkills(cwd);
          }}
          hoverColor={theme.flamingo}
        />
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
            placeholder="Search hooks & skills..."
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

      <div style={{ flex: 1, overflowY: "auto", padding: "0 24px 24px" }}>
        {/* Hooks section */}
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 10,
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                fontFamily: theme.fontHeading,
                color: theme.textSecondary,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              Hooks
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditHook(undefined);
                setEditHookIndex(-1);
                setShowEditHook(true);
              }}
              icon={<Plus size={12} />}
              style={{ fontSize: 11, color: theme.teal }}
            >
              Add Hook
            </Button>
          </div>

          {hooks.length === 0 ? (
            <div
              style={{
                padding: "24px 16px",
                textAlign: "center",
                color: theme.textMuted,
                fontSize: 12,
                fontFamily: theme.fontBody,
                background: theme.bgBase,
                borderRadius: theme.borderRadiusSm,
                border: `2px dashed ${theme.borderColor}`,
              }}
            >
              No hooks configured. Hooks run commands or HTTP requests on Claude events.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {Array.from(grouped.entries()).map(([eventName, entries]) => (
                <div key={eventName}>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      fontFamily: theme.fontHeading,
                      color: (theme as unknown as Record<string, string>)[EVENT_COLORS[eventName]] || theme.textMuted,
                      letterSpacing: "0.04em",
                      marginBottom: 4,
                      marginTop: 4,
                    }}
                  >
                    {eventName}
                  </div>
                  {entries.map(({ hook, index }, j) => {
                    const pastelKey = PASTEL_KEYS[j % PASTEL_KEYS.length];
                    return (
                      <div
                        key={index}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "8px 12px",
                          background: theme[pastelKey] + "12",
                          border: `1.5px solid ${theme.borderColor}`,
                          borderRadius: theme.borderRadiusSm,
                          marginBottom: 4,
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {hook.matcher && (
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 600,
                                color: theme.textMuted,
                                fontFamily: theme.fontCode,
                                marginRight: 8,
                              }}
                            >
                              matcher: {hook.matcher}
                            </span>
                          )}
                          <div
                            style={{
                              fontSize: 11,
                              fontFamily: theme.fontCode,
                              color: theme.textSecondary,
                              fontWeight: 500,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {hook.hooks.map((a) =>
                              a.type === "command" ? a.command : a.url
                            ).join(", ")}
                          </div>
                        </div>
                        <IconButton
                          icon={<Pencil size={11} />}
                          tooltip="Edit"
                          onClick={() => {
                            setEditHook(hook);
                            setEditHookIndex(index);
                            setShowEditHook(true);
                          }}
                          size="sm"
                          hoverColor={theme.sapphire}
                        />
                        <IconButton
                          icon={<Trash2 size={11} />}
                          tooltip="Delete"
                          onClick={() => handleDeleteHook(index)}
                          size="sm"
                          hoverColor={theme.peach}
                        />
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Skills section */}
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 10,
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                fontFamily: theme.fontHeading,
                color: theme.textSecondary,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              Custom Skills
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditSkillPath(undefined);
                setEditSkillName(undefined);
                setEditSkillScope("user");
                setShowEditSkill(true);
              }}
              icon={<Plus size={12} />}
              style={{ fontSize: 11, color: theme.teal }}
            >
              New Skill
            </Button>
          </div>

          {skills.length === 0 ? (
            <div
              style={{
                padding: "24px 16px",
                textAlign: "center",
                color: theme.textMuted,
                fontSize: 12,
                fontFamily: theme.fontBody,
                background: theme.bgBase,
                borderRadius: theme.borderRadiusSm,
                border: `2px dashed ${theme.borderColor}`,
              }}
            >
              No custom skills found. Skills are .md files in ~/.claude/skills/ or
              .claude/skills/.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {skills.map((skill, i) => {
                const pastelKey = PASTEL_KEYS[i % PASTEL_KEYS.length];
                return (
                  <div
                    key={skill.path}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 14px",
                      background: theme[pastelKey] + "12",
                      border: `1.5px solid ${theme.borderColor}`,
                      borderRadius: theme.borderRadiusSm,
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      setEditSkillPath(skill.path);
                      setEditSkillName(skill.name);
                      setEditSkillScope(skill.scope);
                      setShowEditSkill(true);
                    }}
                  >
                    <BookOpen size={14} color={theme.sapphire} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          fontFamily: theme.fontHeading,
                          color: theme.textPrimary,
                        }}
                      >
                        {skill.name}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          fontFamily: theme.fontCode,
                          color: theme.textMuted,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {skill.path}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        padding: "2px 8px",
                        background:
                          skill.scope === "project" ? theme.teal + "22" : theme.lavender + "22",
                        color: skill.scope === "project" ? theme.teal : theme.lavender,
                        borderRadius: theme.borderRadiusFull,
                        border: `1px solid ${skill.scope === "project" ? theme.teal : theme.lavender}`,
                        textTransform: "uppercase",
                      }}
                    >
                      {skill.scope}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showEditHook && (
        <EditHookDialog
          open={showEditHook}
          onClose={() => setShowEditHook(false)}
          hook={editHook}
          onSave={handleSaveHook}
        />
      )}

      {showEditSkill && (
        <EditSkillDialog
          open={showEditSkill}
          onClose={() => {
            setShowEditSkill(false);
            fetchSkills(cwd);
          }}
          skillPath={editSkillPath}
          skillName={editSkillName}
          scope={editSkillScope}
          baseDir={editSkillScope === "project" && cwd ? cwd : home}
        />
      )}
    </div>
  );
}
