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

    const accent = color || theme.lavender;

    const padding = size === "sm" ? "4px 12px" : "8px 16px";
    const fontSize = size === "sm" ? 12 : 13;

    const variantStyles: React.CSSProperties = (() => {
      switch (variant) {
        case "primary":
          return {
            background: accent,
            color: theme.textOnAccent,
            border: "none",
            fontWeight: 600,
            boxShadow: theme.shadowChunky,
            fontFamily: theme.fontHeading,
          };
        case "secondary":
          return {
            background: "transparent",
            color: theme.textSecondary,
            border: `1px solid ${theme.borderColor}`,
          };
        case "ghost":
          return {
            background: "transparent",
            color: theme.textSecondary,
            border: "none",
          };
        case "danger":
          return {
            background: theme.peach,
            color: theme.textOnAccent,
            border: "none",
            fontWeight: 600,
            boxShadow: theme.shadowChunky,
            fontFamily: theme.fontHeading,
          };
      }
    })();

    const hoverStyle: React.CSSProperties = (() => {
      if (!isHovered || isDisabled) return {};
      switch (variant) {
        case "primary":
        case "danger":
          return {
            filter: "brightness(1.1)",
            transform: "translateY(-1px)",
          };
        case "secondary":
          return { background: theme.bgSurface };
        case "ghost":
          return { background: theme.hoverOverlay };
      }
    })();

    const activeStyle: React.CSSProperties =
      isActive && !isDisabled
        ? { transform: "scale(0.98)", filter: "none" }
        : {};

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        {...handlers}
        {...rest}
        style={{
          padding,
          fontSize,
          borderRadius: 8,
          cursor: isDisabled ? "not-allowed" : "pointer",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          width: fullWidth ? "100%" : undefined,
          opacity: isDisabled ? 0.5 : 1,
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
