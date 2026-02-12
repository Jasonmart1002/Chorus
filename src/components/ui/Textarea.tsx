import React, { forwardRef, useEffect, useRef, useImperativeHandle, useState } from "react";
import { useThemeStore } from "../../store/themeStore";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
  autoResize?: boolean;
  maxHeight?: number;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ error, autoResize, maxHeight = 200, style, ...rest }, ref) => {
    const theme = useThemeStore((s) => s.current);
    const innerRef = useRef<HTMLTextAreaElement>(null);
    useImperativeHandle(ref, () => innerRef.current!);
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

    useEffect(() => {
      if (autoResize && innerRef.current) {
        const el = innerRef.current;
        el.style.height = "auto";
        el.style.height = Math.min(el.scrollHeight, maxHeight) + "px";
      }
    }, [rest.value, autoResize, maxHeight]);

    return (
      <textarea
        ref={innerRef}
        {...rest}
        style={{
          width: "100%",
          padding: "12px 14px",
          background: theme.bgBase,
          border: `2px solid ${borderColor}`,
          borderRadius: theme.borderRadiusSm,
          color: theme.textPrimary,
          fontSize: 14,
          outline: "none",
          boxSizing: "border-box",
          resize: autoResize ? "none" : "vertical",
          lineHeight: 1.5,
          fontFamily: theme.fontBody,
          fontWeight: 600,
          boxShadow: focusGlow,
          transition: `border-color 0.18s ease, box-shadow 0.22s ${theme.easeSpring}`,
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
    );
  }
);

Textarea.displayName = "Textarea";
