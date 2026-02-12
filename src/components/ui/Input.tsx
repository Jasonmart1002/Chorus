import React, { forwardRef, useState } from "react";
import { useThemeStore } from "../../store/themeStore";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  errorMessage?: string;
  startIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ error, errorMessage, startIcon, style, ...rest }, ref) => {
    const theme = useThemeStore((s) => s.current);
    const [isFocused, setIsFocused] = useState(false);

    const borderColor = error
      ? theme.peach
      : isFocused
      ? theme.pink
      : theme.borderStrong;

    const focusGlow = isFocused && !error
      ? `0 0 0 3px ${theme.pink}22, 0 0 12px ${theme.pink}18`
      : isFocused && error
      ? `0 0 0 3px ${theme.peach}22, 0 0 12px ${theme.peach}18`
      : undefined;

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: theme.bgBase,
            border: `2px solid ${borderColor}`,
            borderRadius: theme.borderRadiusSm,
            padding: "10px 14px",
            boxShadow: focusGlow,
            transition: `border-color 0.18s ease, box-shadow 0.22s ${theme.easeSpring}`,
          }}
        >
          {startIcon && (
            <span
              style={{
                display: "flex",
                color: isFocused ? theme.pink : theme.textMuted,
                flexShrink: 0,
                transition: "color 0.18s ease",
              }}
            >
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
              fontFamily: theme.fontBody,
              fontWeight: 600,
              lineHeight: 1.4,
              ...style,
            }}
            onFocus={(e) => {
              setIsFocused(true);
              rest.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              rest.onBlur?.(e);
            }}
          />
        </div>
        {error && errorMessage && (
          <span
            style={{
              fontSize: 11,
              color: theme.peach,
              fontFamily: theme.fontBody,
              fontWeight: 600,
              paddingLeft: 4,
            }}
          >
            {errorMessage}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
