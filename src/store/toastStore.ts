import { create } from "zustand";

type ToastVariant = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  duration: number;
  exiting?: boolean;
}

interface ToastStore {
  toasts: Toast[];
  addToast: (message: string, variant: ToastVariant, duration?: number) => void;
  dismissToast: (id: string) => void;
  markExiting: (id: string) => void;
}

const MAX_VISIBLE = 5;

let counter = 0;

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],

  addToast: (message, variant, duration = 4000) => {
    const id = `toast-${++counter}`;
    set((state) => {
      const updated = [...state.toasts, { id, message, variant, duration }];
      // Keep only the last MAX_VISIBLE
      return { toasts: updated.slice(-MAX_VISIBLE) };
    });

    // Auto-dismiss
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.map((t) =>
          t.id === id ? { ...t, exiting: true } : t
        ),
      }));
      // Remove after exit animation
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      }, 300);
    }, duration);
  },

  dismissToast: (id) => {
    set((state) => ({
      toasts: state.toasts.map((t) =>
        t.id === id ? { ...t, exiting: true } : t
      ),
    }));
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 300);
  },

  markExiting: (id) => {
    set((state) => ({
      toasts: state.toasts.map((t) =>
        t.id === id ? { ...t, exiting: true } : t
      ),
    }));
  },
}));

// Imperative API
export const toast = {
  success: (message: string, duration?: number) =>
    useToastStore.getState().addToast(message, "success", duration),
  error: (message: string, duration?: number) =>
    useToastStore.getState().addToast(message, "error", duration),
  info: (message: string, duration?: number) =>
    useToastStore.getState().addToast(message, "info", duration),
  warning: (message: string, duration?: number) =>
    useToastStore.getState().addToast(message, "warning", duration),
};
