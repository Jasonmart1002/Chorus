import { useEffect, useMemo, useState } from "react";
import {
  Timer,
  Plus,
  Search,
  Play,
  Square,
  Pencil,
  Trash2,
  Clock,
  Bot,
  Folder,
  Eye,
  Loader2,
  ShieldOff,
} from "lucide-react";
import { useAutomationsStore } from "../../store/automationsStore";
import { useThemeStore } from "../../store/themeStore";
import { basename, MOD_KEY, SHIFT_KEY } from "../../lib/platform";
import { IconButton } from "../ui/IconButton";
import { Button } from "../ui/Button";
import { CreateAutomationDialog } from "./CreateAutomationDialog";
import type { Automation, DayOfWeek } from "../../types/automations";

function formatSchedule(automation: Automation): string {
  const { schedule } = automation;
  const time = formatTime(schedule.time);

  switch (schedule.frequency) {
    case "daily":
      return `Daily at ${time}`;
    case "weekly": {
      const days = schedule.days.join(", ");
      return `${days} at ${time}`;
    }
    case "monthly": {
      const ordinal = (n: number) => {
        const s = ["th", "st", "nd", "rd"];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
      };
      const dateStr = (schedule.dates || []).map(ordinal).join(", ");
      return dateStr ? `${dateStr} at ${time}` : `Monthly at ${time}`;
    }
    case "custom": {
      const mins = schedule.custom_interval_minutes ?? 60;
      if (mins >= 60 && mins % 60 === 0) {
        const hrs = mins / 60;
        return `Every ${hrs} hr${hrs !== 1 ? "s" : ""}`;
      }
      return `Every ${mins} min`;
    }
  }
}

function formatTime(time24: string): string {
  const [hStr, mStr] = time24.split(":");
  const h = parseInt(hStr, 10);
  const m = mStr || "00";
  if (h === 0) return `12:${m} AM`;
  if (h < 12) return `${h}:${m} AM`;
  if (h === 12) return `12:${m} PM`;
  return `${h - 12}:${m} PM`;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function relativeTimeFuture(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff < 0) return "overdue";
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "< 1m";
  if (mins < 60) return `in ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `in ${hours}h`;
  const days = Math.floor(hours / 24);
  return `in ${days}d`;
}

function useElapsed(startIso: string | undefined) {
  const [elapsed, setElapsed] = useState("");
  useEffect(() => {
    if (!startIso) {
      setElapsed("");
      return;
    }
    const tick = () => {
      const diff = Math.floor(
        (Date.now() - new Date(startIso).getTime()) / 1000
      );
      const m = Math.floor(diff / 60);
      const s = diff % 60;
      setElapsed(m > 0 ? `${m}m ${s}s` : `${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startIso]);
  return elapsed;
}

function AutomationCard({
  automation,
  index,
}: {
  automation: Automation;
  index: number;
}) {
  const theme = useThemeStore((s) => s.current);
  const toggleEnabled = useAutomationsStore((s) => s.toggleEnabled);
  const runNow = useAutomationsStore((s) => s.runNow);
  const stopAutomation = useAutomationsStore((s) => s.stopAutomation);
  const viewOutput = useAutomationsStore((s) => s.viewOutput);
  const deleteAutomation = useAutomationsStore((s) => s.deleteAutomation);
  const setEditingId = useAutomationsStore((s) => s.setEditingId);
  const running = useAutomationsStore(
    (s) => s.runningAutomations[automation.id]
  );
  const [hovered, setHovered] = useState(false);
  const elapsed = useElapsed(running?.started_at);

  const isRunning = !!running;

  const targetLabel = automation.target.agent_id
    ? automation.target.agent_name || automation.target.agent_id.slice(0, 8)
    : automation.target.agent_cwd
    ? `New agent in ${basename(automation.target.agent_cwd)}`
    : "New agent";

  return (
    <div
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      style={{
        background: automation.enabled ? theme.bgCard : `${theme.bgCard}88`,
        border: `2.5px solid ${isRunning ? theme.mint : theme.borderStrong}`,
        borderRadius: theme.borderRadiusSm,
        boxShadow: hovered ? theme.shadowHover : theme.shadowChunky,
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        opacity: automation.enabled ? 1 : 0.65,
        transition: `all 0.2s ${theme.easeSpring}`,
        transform: hovered ? "translate(-2px, -2px)" : "none",
        animation: `springIn 0.35s ${theme.easeSpring} ${index * 0.05}s backwards`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Running glow bar at top */}
      {isRunning && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: `linear-gradient(90deg, ${theme.mint}, ${theme.lavender}, ${theme.mint})`,
            backgroundSize: "200% 100%",
            animation: "shimmer 2s linear infinite",
          }}
        />
      )}

      {/* Top row: name + running indicator + toggle */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flex: 1,
            minWidth: 0,
          }}
        >
          {isRunning && (
            <Loader2
              size={14}
              strokeWidth={2.5}
              color={theme.mint}
              style={{ animation: "spin 1s linear infinite", flexShrink: 0 }}
            />
          )}
          <div
            style={{
              fontSize: 16,
              fontWeight: 800,
              fontFamily: theme.fontHeading,
              color: theme.textPrimary,
              letterSpacing: "-0.02em",
              lineHeight: 1.2,
              flex: 1,
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {automation.name}
          </div>
        </div>

        {/* Running elapsed badge OR enabled toggle */}
        {isRunning ? (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "3px 10px",
              borderRadius: theme.borderRadiusFull,
              background: `${theme.mint}22`,
              border: `2px solid ${theme.mint}`,
              fontSize: 10,
              fontWeight: 800,
              fontFamily: theme.fontCode,
              color: theme.mint,
              letterSpacing: "0.02em",
              flexShrink: 0,
            }}
          >
            {elapsed}
          </span>
        ) : (
          <button
            onClick={() => toggleEnabled(automation.id)}
            title={automation.enabled ? "Disable" : "Enable"}
            style={{
              width: 40,
              height: 22,
              borderRadius: theme.borderRadiusFull,
              background: automation.enabled ? theme.gold : theme.bgBase,
              border: `2px solid ${automation.enabled ? theme.gold : theme.borderStrong}`,
              cursor: "pointer",
              position: "relative",
              transition: `all 0.2s ${theme.easeSpring}`,
              flexShrink: 0,
              padding: 0,
            }}
          >
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                background: automation.enabled
                  ? theme.textOnAccent
                  : theme.textMuted,
                position: "absolute",
                top: 2,
                left: automation.enabled ? 20 : 2,
                transition: `all 0.2s ${theme.easeSpring}`,
                boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
              }}
            />
          </button>
        )}
      </div>

      {/* Badges row */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {/* Running badge */}
        {isRunning && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "3px 10px",
              borderRadius: theme.borderRadiusFull,
              background: `${theme.mint}22`,
              border: `2px solid ${theme.mint}44`,
              fontSize: 10,
              fontWeight: 800,
              fontFamily: theme.fontHeading,
              color: theme.mint,
              letterSpacing: "0.02em",
              animation: "pulse 2s ease-in-out infinite",
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: theme.mint,
                boxShadow: `0 0 6px ${theme.mint}`,
              }}
            />
            Running
          </span>
        )}

        {/* Schedule badge */}
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "3px 10px",
            borderRadius: theme.borderRadiusFull,
            background: theme.goldLight,
            border: `2px solid ${theme.borderStrong}`,
            fontSize: 10,
            fontWeight: 800,
            fontFamily: theme.fontHeading,
            color: theme.textSecondary,
            letterSpacing: "0.02em",
          }}
        >
          <Clock size={10} strokeWidth={2.5} color={theme.gold} />
          {formatSchedule(automation)}
        </span>

        {/* Target badge */}
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "3px 10px",
            borderRadius: theme.borderRadiusFull,
            background: `${theme.lavender}22`,
            border: `2px solid ${theme.borderStrong}`,
            fontSize: 10,
            fontWeight: 800,
            fontFamily: theme.fontHeading,
            color: theme.textSecondary,
            letterSpacing: "0.02em",
          }}
        >
          {automation.target.agent_id ? (
            <Bot size={10} strokeWidth={2.5} color={theme.lavender} />
          ) : (
            <Folder size={10} strokeWidth={2.5} color={theme.lavender} />
          )}
          {targetLabel}
        </span>

        {/* Skip permissions badge */}
        {automation.skip_permissions && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "3px 10px",
              borderRadius: theme.borderRadiusFull,
              background: `${theme.peach}22`,
              border: `2px solid ${theme.peach}44`,
              fontSize: 10,
              fontWeight: 800,
              fontFamily: theme.fontHeading,
              color: theme.peach,
              letterSpacing: "0.02em",
            }}
          >
            <ShieldOff size={10} strokeWidth={2.5} color={theme.peach} />
            No Permissions
          </span>
        )}
      </div>

      {/* Prompt preview */}
      <div
        style={{
          fontSize: 12,
          fontFamily: theme.fontCode,
          color: theme.textMuted,
          fontWeight: 500,
          lineHeight: 1.5,
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          background: `${theme.bgBase}66`,
          padding: "6px 10px",
          borderRadius: theme.borderRadiusSm,
          border: `1.5px solid ${theme.borderColor}`,
        }}
      >
        {automation.prompt}
      </div>

      {/* Stats + actions row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 12,
            fontSize: 10,
            fontFamily: theme.fontBody,
            color: theme.textMuted,
            fontWeight: 600,
          }}
        >
          {automation.last_run_at && (
            <span>
              Last: {relativeTime(automation.last_run_at)}
              {automation.last_run_status === "error" && (
                <span style={{ color: theme.peach, marginLeft: 3 }}>
                  (error)
                </span>
              )}
            </span>
          )}
          {automation.next_run_at && automation.enabled && !isRunning && (
            <span>Next: {relativeTimeFuture(automation.next_run_at)}</span>
          )}
          <span>Runs: {automation.run_count}</span>
        </div>

        <div style={{ display: "flex", gap: 4 }}>
          {isRunning ? (
            <>
              <IconButton
                icon={<Eye size={12} strokeWidth={2.2} />}
                tooltip="View Output"
                onClick={() => viewOutput(automation.id)}
                hoverColor={theme.lavender}
              />
              <IconButton
                icon={<Square size={12} strokeWidth={2.5} />}
                tooltip="Stop"
                onClick={() => stopAutomation(automation.id)}
                hoverColor={theme.peach}
              />
            </>
          ) : (
            <>
              <IconButton
                icon={<Pencil size={12} strokeWidth={2.2} />}
                tooltip="Edit"
                onClick={() => setEditingId(automation.id)}
                hoverColor={theme.gold}
              />
              <IconButton
                icon={<Play size={12} strokeWidth={2.5} />}
                tooltip="Run Now"
                onClick={() => runNow(automation.id)}
                hoverColor={theme.mint}
              />
              <IconButton
                icon={<Trash2 size={12} strokeWidth={2.2} />}
                tooltip="Delete"
                onClick={() => deleteAutomation(automation.id)}
                hoverColor={theme.peach}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function AutomationsView() {
  const theme = useThemeStore((s) => s.current);
  const automations = useAutomationsStore((s) => s.automations);
  const runningAutomations = useAutomationsStore((s) => s.runningAutomations);
  const loading = useAutomationsStore((s) => s.loading);
  const fetchAutomations = useAutomationsStore((s) => s.fetchAutomations);
  const searchQuery = useAutomationsStore((s) => s.searchQuery);
  const setSearchQuery = useAutomationsStore((s) => s.setSearchQuery);
  const showCreateDialog = useAutomationsStore((s) => s.showCreateDialog);
  const setShowCreateDialog = useAutomationsStore((s) => s.setShowCreateDialog);
  const editingId = useAutomationsStore((s) => s.editingId);
  const runningCount = Object.keys(runningAutomations).length;

  useEffect(() => {
    fetchAutomations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    if (!searchQuery) return automations;
    const q = searchQuery.toLowerCase();
    return automations.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.prompt.toLowerCase().includes(q)
    );
  }, [automations, searchQuery]);

  // Empty state
  if (!loading && automations.length === 0) {
    return (
      <>
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
              background: theme.accentGradient,
              opacity: 0.12,
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
              background: theme.goldLight,
              border: `3px solid ${theme.borderStrong}`,
              boxShadow: theme.shadowChunky,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Timer size={40} strokeWidth={2} color={theme.gold} />
          </div>

          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              fontFamily: theme.fontHeading,
              color: theme.textPrimary,
              textShadow: `2px 2px 0px ${theme.goldLight}`,
              letterSpacing: "-0.02em",
            }}
          >
            No automations yet
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
            Schedule prompts to run automatically at specific times ~
          </div>

          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <Button
              variant="primary"
              color={theme.gold}
              onClick={() => setShowCreateDialog(true)}
              icon={<Plus size={14} strokeWidth={2.5} />}
            >
              New Automation
            </Button>
            <kbd
              style={{
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
              {MOD_KEY}+{SHIFT_KEY}+A
            </kbd>
          </div>
        </div>
        {showCreateDialog && (
          <CreateAutomationDialog
            editingId={editingId}
            onClose={() => setShowCreateDialog(false)}
          />
        )}
      </>
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
              background: theme.goldLight,
              border: `2.5px solid ${theme.borderStrong}`,
              boxShadow: theme.shadowChunky,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Timer size={18} color={theme.gold} strokeWidth={2.2} />
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
              Automations
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
              {automations.length} automation
              {automations.length !== 1 ? "s" : ""} &middot;{" "}
              {automations.filter((a) => a.enabled).length} active
              {runningCount > 0 && (
                <>
                  {" "}
                  &middot; {runningCount} running
                </>
              )}
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
              placeholder="Search automations..."
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
          <Button
            variant="primary"
            size="sm"
            color={theme.gold}
            onClick={() => setShowCreateDialog(true)}
            icon={<Plus size={13} strokeWidth={2.5} />}
          >
            New
          </Button>
        </div>
      </div>

      {/* Card list */}
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
        {filtered.length === 0 && searchQuery ? (
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
            No matching automations found ~
          </div>
        ) : (
          filtered.map((automation, i) => (
            <AutomationCard
              key={automation.id}
              automation={automation}
              index={i}
            />
          ))
        )}
      </div>

      {showCreateDialog && (
        <CreateAutomationDialog
          editingId={editingId}
          onClose={() => setShowCreateDialog(false)}
        />
      )}
    </div>
  );
}
