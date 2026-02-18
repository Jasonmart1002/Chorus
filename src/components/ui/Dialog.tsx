import { useEffect, useRef, useCallback } from "react";
import ReactDOM from "react-dom";
import { useThemeStore } from "../../store/themeStore";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit?: () => void;
  title: string;
  description?: string;
  width?: number;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Dialog({
  open,
  onClose,
  onSubmit,
  title,
  description,
  width = 420,
  children,
  footer,
}: DialogProps) {
  const theme = useThemeStore((s) => s.current);
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<Element | null>(null);

  // Store active element on mount, restore on unmount
  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement;
      // Focus first focusable element in the dialog
      requestAnimationFrame(() => {
        if (panelRef.current) {
          const first = panelRef.current.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
          first?.focus();
        }
      });
    }
    return () => {
      if (previousFocusRef.current instanceof HTMLElement) {
        previousFocusRef.current.focus();
      }
    };
  }, [open]);

  // Focus trap
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && onSubmit) {
        e.preventDefault();
        onSubmit();
        return;
      }
      if (e.key === "Tab" && panelRef.current) {
        const focusable = Array.from(
          panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    },
    [onClose, onSubmit]
  );

  if (!open) return null;

  return ReactDOM.createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      style={{
        position: "fixed",
        inset: 0,
        background: theme.overlayColor,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        backdropFilter: "blur(2px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={handleKeyDown}
    >
      <div
        ref={panelRef}
        style={{
          background: theme.bgSurface,
          borderRadius: theme.borderRadiusXl,
          width,
          maxWidth: "90vw",
          maxHeight: "85vh",
          boxShadow: theme.shadowDialog,
          border: `2px solid ${theme.borderStrong}`,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          animation: "springIn 0.25s ease-out",
        }}
      >
        {/* Decorative pink gradient top stripe */}
        <div
          style={{
            height: 4,
            background: theme.accentGradient,
            borderRadius: `${theme.borderRadiusXl}px ${theme.borderRadiusXl}px 0 0`,
            flexShrink: 0,
          }}
        />

        {/* Header */}
        <div style={{ padding: "20px 24px 0" }}>
          <h2
            id="dialog-title"
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 800,
              color: theme.textPrimary,
              fontFamily: theme.fontHeading,
              textShadow: `1px 1px 0px ${theme.borderStrong}18`,
              letterSpacing: "-0.01em",
            }}
          >
            {title}
          </h2>
          {description && (
            <p
              style={{
                margin: "6px 0 0",
                fontSize: 12,
                color: theme.textMuted,
                fontFamily: theme.fontBody,
                lineHeight: 1.5,
              }}
            >
              {description}
            </p>
          )}
        </div>

        {/* Body */}
        <div
          style={{
            padding: "16px 24px",
            overflowY: "auto",
            flex: 1,
          }}
        >
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            style={{
              padding: "12px 24px 20px",
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
              borderTop: `1px solid ${theme.borderColor}`,
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
