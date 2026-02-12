import React, { forwardRef } from "react";
import { Loader } from "lucide-react";
import { useThemeStore } from "../../store/themeStore";
import { useInteraction } from "../../hooks/useInteraction";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
  color?: string;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant,
      size = "md",
      color,
      loading,
      fullWidth,
      icon,
      disabled,
      children,
      style,
      ...rest
    },
    ref
  ) => {
    const theme = useThemeStore((s) => s.current);
    const isDisabled = disabled || loading;
    const { isHovered, isActive, handlers } = useInteraction({
      disabled: isDisabled,
    });

    const accent = color || theme.pink;

    const padding = size === "sm" ? "5px 14px" : "9px 18px";
    const fontSize = size === "sm" ? 12 : 13;

    // --- Variant base styles (candy button physics) ---
    const variantStyles: React.CSSProperties = (() => {
      switch (variant) {
        case "primary":
          return {
            background: accent === theme.pink ? theme.accentGradient : accent,
            color: theme.textOnAccent,
            border: `2px solid ${theme.borderStrong}`,
            fontWeight: 700,
            boxShadow: theme.shadowChunky,
            fontFamily: theme.fontHeading,
            letterSpacing: "0.01em",
          };
        case "secondary":
          return {
            background: theme.bgSurface,
            color: theme.textSecondary,
            border: `2px solid ${theme.borderStrong}`,
            boxShadow: theme.shadowChunky,
            fontFamily: theme.fontBody,
            fontWeight: 700,
          };
        case "ghost":
          return {
            background: "transparent",
            color: theme.textSecondary,
            border: "2px solid transparent",
            fontFamily: theme.fontBody,
            fontWeight: 600,
          };
        case "danger":
          return {
            background: theme.peach,
            color: theme.textOnAccent,
            border: `2px solid ${theme.borderStrong}`,
            fontWeight: 700,
            boxShadow: theme.shadowChunky,
            fontFamily: theme.fontHeading,
            letterSpacing: "0.01em",
          };
      }
    })();

    // --- Hover: lift up + bigger shadow (candy float) ---
    const hoverStyle: React.CSSProperties = (() => {
      if (!isHovered || isDisabled) return {};
      switch (variant) {
        case "primary":
        case "danger":
          return {
            transform: "translate(-2px, -2px)",
            boxShadow: theme.shadowHover,
            filter: "brightness(1.05)",
          };
        case "secondary":
          return {
            transform: "translate(-2px, -2px)",
            boxShadow: theme.shadowHover,
            background: theme.cardHover,
          };
        case "ghost":
          return { background: theme.hoverOverlay };
      }
    })();

    // --- Press: push down + squish shadow (satisfying click) ---
    const activeStyle: React.CSSProperties = (() => {
      if (!isActive || isDisabled) return {};
      switch (variant) {
        case "primary":
        case "danger":
        case "secondary":
          return {
            transform: "translate(2px, 2px)",
            boxShadow: theme.shadowPress,
            filter: undefined,
          };
        case "ghost":
          return { transform: "scale(0.97)", opacity: 0.85 };
      }
    })();

    // Transition for that bouncy candy feel
    const transition = variant === "ghost"
      ? "background 0.15s ease, transform 0.12s ease"
      : `transform 0.18s ${theme.easeSpring}, box-shadow 0.18s ${theme.easeSpring}, filter 0.15s ease`;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        {...handlers}
        {...rest}
        style={{
          padding,
          fontSize,
          borderRadius: theme.borderRadiusSm,
          cursor: isDisabled ? "not-allowed" : "pointer",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          width: fullWidth ? "100%" : undefined,
          opacity: isDisabled ? 0.5 : 1,
          transition,
          lineHeight: 1.3,
          userSelect: "none",
          ...variantStyles,
          ...hoverStyle,
          ...activeStyle,
          ...style,
        }}
      >
        {loading ? (
          <Loader size={14} style={{ animation: "spin 1s linear infinite" }} />
        ) : icon ? (
          icon
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
