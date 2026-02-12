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
  const { isHovered, isActive, handlers } = useInteraction({ disabled });

  const dim = size === "sm" ? 30 : 34;
  const tint = tintColor || theme.pink;
  const effectiveColor =
    active || isHovered ? (hoverColor || theme.pink) : theme.textMuted;

  // --- Tinted: chunky candy icon button ---
  // --- Ghost: minimal, just a gentle hover tint ---
  const baseStyles: React.CSSProperties =
    variant === "tinted"
      ? {
          background: `${tint}18`,
          border: `2px solid ${tint}44`,
          color: disabled ? theme.textMuted : tint,
          boxShadow: `2px 2px 0px ${tint}33`,
        }
      : {
          background: "none",
          border: "2px solid transparent",
          color: disabled ? theme.textMuted : effectiveColor,
          boxShadow: "none",
        };

  const hoverStyles: React.CSSProperties = (() => {
    if (!isHovered || disabled) return {};
    if (variant === "tinted") {
      return {
        background: `${tint}30`,
        transform: "translate(-1px, -1px)",
        boxShadow: `3px 3px 0px ${tint}44`,
      };
    }
    return {
      background: theme.hoverOverlay,
      color: hoverColor || theme.pink,
    };
  })();

  const activeStyles: React.CSSProperties = (() => {
    if (!isActive || disabled) return {};
    if (variant === "tinted") {
      return {
        transform: "translate(1px, 1px)",
        boxShadow: `0px 0px 0px ${tint}33`,
      };
    }
    return { transform: "scale(0.92)" };
  })();

  const transition =
    variant === "tinted"
      ? `transform 0.15s ${theme.easeSpring}, box-shadow 0.15s ${theme.easeSpring}, background 0.12s ease`
      : "background 0.12s ease, color 0.12s ease, transform 0.12s ease";

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
        borderRadius: theme.borderRadiusSm,
        cursor: disabled ? "not-allowed" : "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.5 : 1,
        fontSize: 11,
        fontWeight: 600,
        gap: 4,
        transition,
        userSelect: "none",
        ...baseStyles,
        ...hoverStyles,
        ...activeStyles,
        ...style,
      }}
    >
      {icon}
    </button>
  );
}
