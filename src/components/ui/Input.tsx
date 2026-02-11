import React, { forwardRef } from "react";
import { useThemeStore } from "../../store/themeStore";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  errorMessage?: string;
  startIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ error, errorMessage, startIcon, style, ...rest }, ref) => {
    const theme = useThemeStore((s) => s.current);

    const borderColor = error ? theme.peach : theme.mauve;

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: theme.bgBase,
            border: `1px solid ${borderColor}`,
            borderRadius: 8,
            padding: "8px 12px",
          }}
        >
          {startIcon && (
            <span style={{ display: "flex", color: theme.textMuted, flexShrink: 0 }}>
              {startIcon}
            </span>
          )}
          <input
            ref={ref}
            {...rest}
            style={{
              width: "100%",
              padding: 0,
              background: "transparent",
              border: "none",
              color: theme.textPrimary,
              fontSize: 14,
              outline: "none",
              ...style,
            }}
            onFocus={(e) => {
              const container = e.currentTarget.parentElement;
              if (container) container.style.borderColor = error ? theme.peach : theme.lavender;
              rest.onFocus?.(e);
            }}
            onBlur={(e) => {
              const container = e.currentTarget.parentElement;
              if (container) container.style.borderColor = borderColor;
              rest.onBlur?.(e);
            }}
          />
        </div>
        {error && errorMessage && (
          <span style={{ fontSize: 11, color: theme.peach }}>{errorMessage}</span>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
