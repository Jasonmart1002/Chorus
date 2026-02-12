import { useRef, useEffect } from "react";
import { useThemeStore } from "../../store/themeStore";
import { Dialog } from "./Dialog";
import { Button } from "./Button";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmLabel?: string;
  variant?: "danger" | "default";
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  variant = "default",
}: ConfirmDialogProps) {
  const theme = useThemeStore((s) => s.current);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open && variant === "danger") {
      requestAnimationFrame(() => cancelRef.current?.focus());
    }
  }, [open, variant]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      width={380}
      footer={
        <>
          <Button ref={cancelRef} variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={variant === "danger" ? "danger" : "primary"}
            onClick={async () => {
              await onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p
        style={{
          margin: 0,
          fontSize: 13,
          lineHeight: 1.6,
          color: theme.textSecondary,
          fontFamily: theme.fontBody,
          fontWeight: 600,
        }}
      >
        {description}
      </p>
    </Dialog>
  );
}
