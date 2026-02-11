import React, { useEffect, useRef, useCallback, useState } from "react";
import { useThemeStore } from "../../store/themeStore";

interface DropdownMenuProps {
  trigger: React.ReactElement;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  align?: "start" | "end";
  side?: "top" | "bottom";
  children: React.ReactNode;
}

export function DropdownMenu({
  trigger,
  open,
  onOpenChange,
  align = "end",
  side = "bottom",
  children,
}: DropdownMenuProps) {
  const theme = useThemeStore((s) => s.current);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [flippedSide, setFlippedSide] = useState(side);

  // Outside click close
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onOpenChange(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onOpenChange]);

  // Viewport boundary detection
  useEffect(() => {
    if (!open || !menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    if (side === "bottom" && rect.bottom > window.innerHeight) {
      setFlippedSide("top");
    } else if (side === "top" && rect.top < 0) {
      setFlippedSide("bottom");
    } else {
      setFlippedSide(side);
    }
  }, [open, side]);

  // Keyboard nav
  const handleMenuKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        onOpenChange(false);
        return;
      }
      if (!menuRef.current) return;
      const items = Array.from(
        menuRef.current.querySelectorAll<HTMLElement>('[role="menuitem"]')
      );
      if (items.length === 0) return;

      const currentIdx = items.indexOf(document.activeElement as HTMLElement);

      if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = currentIdx < items.length - 1 ? currentIdx + 1 : 0;
        items[next].focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prev = currentIdx > 0 ? currentIdx - 1 : items.length - 1;
        items[prev].focus();
      } else if (e.key === "Enter" || e.key === " ") {
        if (currentIdx >= 0) {
          e.preventDefault();
          items[currentIdx].click();
        }
      }
    },
    [onOpenChange]
  );

  // Focus first item when menu opens
  useEffect(() => {
    if (open && menuRef.current) {
      requestAnimationFrame(() => {
        const first = menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]');
        first?.focus();
      });
    }
  }, [open]);

  const positionStyle: React.CSSProperties = {
    position: "absolute",
    [align === "end" ? "right" : "left"]: 0,
    ...(flippedSide === "bottom"
      ? { top: "100%", marginTop: 4 }
      : { bottom: "100%", marginBottom: 4 }),
  };

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      {trigger}
      {open && (
        <div
          ref={menuRef}
          role="menu"
          onKeyDown={handleMenuKeyDown}
          style={{
            ...positionStyle,
            background: theme.bgCard,
            border: `1px solid ${theme.borderColor}`,
            borderRadius: 8,
            padding: 4,
            minWidth: 180,
            boxShadow: theme.shadowDialog,
            zIndex: 60,
            animation: "fadeIn 0.15s ease-out",
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

interface DropdownMenuItemProps {
  onClick: () => void;
  children: React.ReactNode;
  active?: boolean;
  icon?: React.ReactNode;
}

export function DropdownMenuItem({
  onClick,
  children,
  active,
  icon,
}: DropdownMenuItemProps) {
  const theme = useThemeStore((s) => s.current);
  const { isHovered, handlers } = useItemInteraction();

  return (
    <button
      role="menuitem"
      tabIndex={-1}
      onClick={onClick}
      {...handlers}
      style={{
        width: "100%",
        padding: "8px 12px",
        background: active
          ? theme.lavenderLight
          : isHovered
          ? theme.lavenderLight
          : "transparent",
        border: "none",
        borderRadius: 8,
        cursor: "pointer",
        textAlign: "left",
        fontSize: 12,
        color: theme.textPrimary,
        display: "flex",
        alignItems: "center",
        gap: 8,
        outline: "none",
      }}
    >
      {icon}
      {children}
    </button>
  );
}

// Lightweight hover for menu items (no need for full useInteraction)
function useItemInteraction() {
  const [isHovered, setIsHovered] = React.useState(false);
  return {
    isHovered,
    handlers: {
      onMouseEnter: () => setIsHovered(true),
      onMouseLeave: () => setIsHovered(false),
    },
  };
}
