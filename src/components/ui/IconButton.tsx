import React from "react";
import { useThemeStore } from "../../store/themeStore";
import { useInteraction } from "../../hooks/useInteraction";

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  size?: "sm" | "md";
  tooltip?: string;
  hoverColor?: string;
  active?: boolean;
  variant?: "ghost" | "tinted";
  tintColor?: string;
}

export function IconButton({
  icon,
  size = "sm",
  tooltip,
  hoverColor,
  active,
  variant = "ghost",
  tintColor,
  disabled,
  style,
  ...rest
}: IconButtonProps) {
  const theme = useThemeStore((s) => s.current);
  const { isHovered, handlers } = useInteraction({ disabled });

  const dim = size === "sm" ? 28 : 32;
  const effectiveColor = active || isHovered ? (hoverColor || theme.lavender) : theme.textMuted;

  const baseStyles: React.CSSProperties =
    variant === "tinted"
      ? {
          background: `${tintColor || theme.lavender}18`,
          border: `1px solid ${tintColor || theme.lavender}33`,
          color: disabled ? theme.textMuted : (tintColor || theme.lavender),
        }
      : {
          background: "none",
          border: "none",
          color: disabled ? theme.textMuted : effectiveColor,
        };

  const hoverStyles: React.CSSProperties =
    isHovered && !disabled
      ? variant === "tinted"
        ? { background: `${tintColor || theme.lavender}30` }
        : {}
      : {};

  return (
    <button
      title={tooltip}
      aria-label={tooltip}
      disabled={disabled}
      {...handlers}
      {...rest}
      style={{
        width: dim,
        height: dim,
        minWidth: dim,
        minHeight: dim,
        padding: 0,
        borderRadius: 8,
        cursor: disabled ? "not-allowed" : "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.5 : 1,
        fontSize: 11,
        fontWeight: 600,
        gap: 4,
        ...baseStyles,
        ...hoverStyles,
        ...style,
      }}
    >
      {icon}
    </button>
  );
}
