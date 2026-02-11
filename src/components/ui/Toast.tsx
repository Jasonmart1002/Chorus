import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from "lucide-react";
import { useThemeStore } from "../../store/themeStore";
import type { Toast as ToastType } from "../../store/toastStore";

const VARIANT_CONFIG = {
  success: { Icon: CheckCircle, colorKey: "mint" as const },
  error: { Icon: AlertCircle, colorKey: "peach" as const },
  warning: { Icon: AlertTriangle, colorKey: "butter" as const },
  info: { Icon: Info, colorKey: "lavender" as const },
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
        alignItems: "center",
        gap: 10,
        padding: "10px 14px",
        background: bgColor,
        border: `1px solid ${color}`,
        borderRadius: 8,
        boxShadow: theme.shadowDialog,
        minWidth: 280,
        maxWidth: 400,
        animation: t.exiting
          ? "slideOutRight 0.3s ease-in forwards"
          : "slideInRight 0.3s ease-out",
      }}
    >
      <config.Icon size={16} color={color} style={{ flexShrink: 0 }} />
      <span
        style={{
          flex: 1,
          fontSize: 13,
          color: theme.textPrimary,
          lineHeight: 1.4,
        }}
      >
        {t.message}
      </span>
      <button
        onClick={() => onDismiss(t.id)}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: theme.textMuted,
          padding: 2,
          display: "flex",
          flexShrink: 0,
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
}
