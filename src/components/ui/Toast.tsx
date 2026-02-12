import React from "react";
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from "lucide-react";
import { useThemeStore } from "../../store/themeStore";
import { useInteraction } from "../../hooks/useInteraction";
import type { Toast as ToastType } from "../../store/toastStore";

const VARIANT_CONFIG = {
  success: { Icon: CheckCircle, colorKey: "mint" as const },
  error: { Icon: AlertCircle, colorKey: "peach" as const },
  warning: { Icon: AlertTriangle, colorKey: "gold" as const },
  info: { Icon: Info, colorKey: "pink" as const },
};

interface ToastProps {
  toast: ToastType;
  onDismiss: (id: string) => void;
}

export function Toast({ toast: t, onDismiss }: ToastProps) {
  const theme = useThemeStore((s) => s.current);
  const config = VARIANT_CONFIG[t.variant];
  const color = theme[config.colorKey];
  const lightKey = `${config.colorKey}Light` as keyof typeof theme;
  const bgColor = theme[lightKey] as string;

  return (
    <div
      role="alert"
      style={{
        display: "flex",
        alignItems: "stretch",
        minWidth: 280,
        maxWidth: 420,
        background: bgColor,
        border: `2px solid ${theme.borderStrong}`,
        borderRadius: theme.borderRadiusSm,
        boxShadow: theme.shadowDialog,
        overflow: "hidden",
        animation: t.exiting
          ? "slideOutRight 0.3s ease-in forwards"
          : "slideInRight 0.3s ease-out",
      }}
    >
      {/* Colored left stripe */}
      <div
        style={{
          width: 4,
          background: color,
          flexShrink: 0,
          borderRadius: `${theme.borderRadiusSm}px 0 0 ${theme.borderRadiusSm}px`,
        }}
      />

      {/* Content area */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "14px 16px",
          flex: 1,
        }}
      >
        <config.Icon
          size={18}
          color={color}
          style={{ flexShrink: 0 }}
        />
        <span
          style={{
            flex: 1,
            fontSize: 13,
            fontWeight: 600,
            color: theme.textPrimary,
            fontFamily: theme.fontBody,
            lineHeight: 1.4,
          }}
        >
          {t.message}
        </span>
        <DismissButton color={theme.textMuted} onClick={() => onDismiss(t.id)} />
      </div>
    </div>
  );
}

// --- Cute dismiss X with hover state ---
function DismissButton({
  color,
  onClick,
}: {
  color: string;
  onClick: () => void;
}) {
  const theme = useThemeStore((s) => s.current);
  const { isHovered, handlers } = useInteraction({});

  return (
    <button
      onClick={onClick}
      {...handlers}
      style={{
        background: isHovered ? theme.hoverOverlay : "none",
        border: "none",
        cursor: "pointer",
        color: isHovered ? theme.peach : color,
        padding: 4,
        display: "flex",
        flexShrink: 0,
        borderRadius: theme.borderRadiusSm,
        transition: "background 0.12s ease, color 0.12s ease, transform 0.12s ease",
        transform: isHovered ? "scale(1.15)" : "scale(1)",
      }}
    >
      <X size={14} />
    </button>
  );
}
