import { useThemeStore } from "../store/themeStore";
import { MOD_KEY, SHIFT_KEY } from "../lib/platform";
import { Dialog } from "./ui/Dialog";

interface Props {
  onClose: () => void;
}

interface Shortcut {
  keys: string[];
  label: string;
}

interface Section {
  title: string;
  shortcuts: Shortcut[];
}

const MOD = MOD_KEY;
const SHIFT = SHIFT_KEY;

const SECTIONS: Section[] = [
  {
    title: "Navigation",
    shortcuts: [
      { keys: [MOD, "J"], label: "Next agent" },
      { keys: [MOD, SHIFT, "J"], label: "Previous agent" },
      { keys: [MOD, "1\u20139"], label: "Select agent by index" },
      { keys: [MOD, "F"], label: "Focus search" },
      { keys: [MOD, "L"], label: "Focus prompt input" },
    ],
  },
  {
    title: "Actions",
    shortcuts: [
      { keys: [MOD, "N"], label: "New agent" },
      { keys: [MOD, SHIFT, "G"], label: "Open Git menu" },
      { keys: [MOD, SHIFT, "R"], label: "Open Run dialog" },
      { keys: [MOD, SHIFT, "E"], label: "Open Terminal menu" },
    ],
  },
  {
    title: "Vibe Mode",
    shortcuts: [
      { keys: [MOD, SHIFT, "V"], label: "Toggle vibe mode" },
      { keys: [MOD, SHIFT, "S"], label: "Skip current agent" },
      { keys: ["Esc"], label: "Exit vibe mode" },
    ],
  },
  {
    title: "Editing",
    shortcuts: [
      { keys: [MOD, "Enter"], label: "Send prompt / confirm dialog" },
      { keys: [SHIFT, "Tab"], label: "Cycle prompt mode" },
    ],
  },
  {
    title: "Panels",
    shortcuts: [
      { keys: [MOD, SHIFT, "P"], label: "Skills & Plugins" },
      { keys: [MOD, SHIFT, "A"], label: "Automations" },
      { keys: [MOD, SHIFT, "M"], label: "MCP Servers" },
      { keys: [MOD, SHIFT, "H"], label: "Hooks & Skills" },
    ],
  },
  {
    title: "Agent Tools",
    shortcuts: [
      { keys: [MOD, "."], label: "Agent Config" },
    ],
  },
  {
    title: "App",
    shortcuts: [
      { keys: [MOD, SHIFT, "T"], label: "Toggle theme" },
      { keys: [MOD, "B"], label: "Toggle sidebar" },
      { keys: [MOD, "K"], label: "Show this cheat sheet" },
    ],
  },
];

export function ShortcutsDialog({ onClose }: Props) {
  const theme = useThemeStore((s) => s.current);

  const kbdStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 24,
    height: 24,
    padding: "0 7px",
    background: theme.bgBase,
    border: `2px solid ${theme.borderStrong}`,
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 700,
    fontFamily: theme.fontCode,
    color: theme.textPrimary,
    boxShadow: `0 2px 0 ${theme.borderStrong}`,
    lineHeight: 1,
  };

  return (
    <Dialog
      open={true}
      onClose={onClose}
      title="Keyboard Shortcuts"
      width={480}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {SECTIONS.map((section) => (
          <div key={section.title}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                fontFamily: theme.fontHeading,
                color: theme.textMuted,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              {section.title}
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              {section.shortcuts.map((shortcut) => (
                <div
                  key={shortcut.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "6px 8px",
                    borderRadius: theme.borderRadiusSm,
                    background: theme.bgCard,
                    border: `1.5px solid ${theme.borderColor}`,
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      fontFamily: theme.fontBody,
                      color: theme.textSecondary,
                    }}
                  >
                    {shortcut.label}
                  </span>
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    {shortcut.keys.map((key, i) => (
                      <span key={i} style={kbdStyle}>
                        {key}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Dialog>
  );
}
