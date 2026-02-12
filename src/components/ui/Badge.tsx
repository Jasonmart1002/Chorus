import { useThemeStore } from "../../store/themeStore";

interface BadgeProps {
  variant: "status" | "count" | "label";
  color?: string;
  pulse?: boolean;
  glow?: boolean;
  children?: React.ReactNode;
}

export function Badge({ variant, color, pulse, glow, children }: BadgeProps) {
  const theme = useThemeStore((s) => s.current);
  const c = color || theme.textMuted;

  switch (variant) {
    // --- Status dot: 10px circle with a cute white ring border ---
    case "status":
      return (
        <span
          style={{
            display: "inline-block",
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: c,
            flexShrink: 0,
            border: `2px solid ${theme.bgSurface}`,
            boxShadow: glow
              ? `0 0 0 2px ${c}, 0 0 10px ${c}88`
              : `0 0 0 1px ${c}33`,
            animation: pulse ? "pulse 1.5s infinite" : undefined,
          }}
        />
      );

    // --- Count: chunky candy pill with border ---
    case "count":
      return (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: 20,
            height: 20,
            padding: "0 7px",
            borderRadius: theme.borderRadiusFull,
            background: `${c}33`,
            color: theme.textSecondary,
            fontSize: 10,
            fontWeight: 800,
            fontFamily: theme.fontHeading,
            border: `2px solid ${theme.borderStrong}`,
            letterSpacing: "0.02em",
          }}
        >
          {children}
        </span>
      );

    // --- Label: bold chunky pill badge ---
    case "label":
      return (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "3px 10px",
            borderRadius: theme.borderRadiusFull,
            background: c,
            color: theme.textOnAccent,
            fontSize: 11,
            fontWeight: 800,
            fontFamily: theme.fontHeading,
            border: `2px solid ${theme.borderStrong}`,
            letterSpacing: "0.01em",
            lineHeight: 1.3,
          }}
        >
          {children}
        </span>
      );
  }
}
