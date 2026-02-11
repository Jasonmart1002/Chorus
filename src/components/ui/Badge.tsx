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
    case "status":
      return (
        <span
          style={{
            display: "inline-block",
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: c,
            flexShrink: 0,
            boxShadow: glow ? `0 0 0 2px ${c}, 0 0 8px ${c}` : undefined,
            animation: pulse ? "pulse 1.5s infinite" : undefined,
          }}
        />
      );

    case "count":
      return (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: 18,
            height: 18,
            padding: "0 6px",
            borderRadius: 12,
            background: `${c}33`,
            color: theme.textSecondary,
            fontSize: 10,
            fontWeight: 700,
          }}
        >
          {children}
        </span>
      );

    case "label":
      return (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "2px 8px",
            borderRadius: 12,
            background: c,
            color: theme.textOnAccent,
            fontSize: 11,
            fontWeight: 700,
            fontFamily: theme.fontHeading,
          }}
        >
          {children}
        </span>
      );
  }
}
