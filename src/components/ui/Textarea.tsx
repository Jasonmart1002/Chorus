import React, { forwardRef, useEffect, useRef, useImperativeHandle } from "react";
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

    const borderColor = error ? theme.peach : theme.mauve;

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
          padding: "8px 12px",
          background: theme.bgBase,
          border: `1px solid ${borderColor}`,
          borderRadius: 8,
          color: theme.textPrimary,
          fontSize: 14,
          outline: "none",
          boxSizing: "border-box",
          resize: autoResize ? "none" : "vertical",
          lineHeight: 1.5,
          fontFamily: "inherit",
          ...style,
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = error ? theme.peach : theme.lavender;
          rest.onFocus?.(e);
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = borderColor;
          rest.onBlur?.(e);
        }}
      />
    );
  }
);

Textarea.displayName = "Textarea";
