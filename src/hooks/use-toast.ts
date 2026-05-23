// ═══════════════════════════════════════════════════════════════
// TOAST HOOK & MANAGER — PRODUCTION REFACTOR
// src/hooks/use-toast.ts
//
// Changelog vs. original:
//   [FIX-4] Memory leak guard: when the last useToast subscriber
//           unmounts, all pending removal timeouts are cleared via
//           clearAllToastTimeouts() so no orphaned timers remain.
//   [FIX-5] Persistent notification logic: duration === 0 is now
//           treated as "keep forever" — addToRemoveQueue is never
//           called for that toast, and it will only leave via an
//           explicit dismiss() call.
// ═══════════════════════════════════════════════════════════════

import * as React from "react";
import type { ToastActionElement, ToastProps } from "@/components/ui/toast";

// ─── Configuration ────────────────────────────────────────────────────────────

export const TOAST_LIMIT = 1;
export const TOAST_REMOVE_DELAY = 5_000;

// ─── Type Definitions ─────────────────────────────────────────────────────────

export type ToasterToast = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
  onOpenChange?: (open: boolean) => void;
};

export const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const;

export type ActionType = typeof actionTypes;

export type Action =
  | { type: ActionType["ADD_TOAST"]; toast: ToasterToast }
  | { type: ActionType["UPDATE_TOAST"]; toast: Partial<ToasterToast> }
  | { type: ActionType["DISMISS_TOAST"]; toastId?: ToasterToast["id"] }
  | { type: ActionType["REMOVE_TOAST"]; toastId?: ToasterToast["id"] };

export interface State {
  toasts: ToasterToast[];
}

export type ToastReturn = {
  id: string;
  dismiss: () => void;
  update: (props: ToasterToast) => void;
};

export type ToastInput = Omit<ToasterToast, "id">;

export type UseToastReturn = State & {
  toast: (props: ToastInput) => ToastReturn;
  dismiss: (toastId?: string) => void;
};

// ─── Internal State & Helpers ─────────────────────────────────────────────────

let count = 0;

function genId(): string {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return count.toString();
}

/**
 * Module-level map of pending removal timeouts.
 * Entries are created by addToRemoveQueue and cleared either when
 * the toast is removed or when all subscribers unmount.
 */
const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Schedule a toast for removal after `delay` milliseconds.
 *
 * [FIX-5] If `delay` is exactly 0, the toast is treated as persistent
 * and NO timeout is scheduled. Only an explicit dismiss() removes it.
 */
export const addToRemoveQueue = (
  toastId: string,
  delay = TOAST_REMOVE_DELAY
): void => {
  // [FIX-5] duration === 0 → persistent toast; do nothing.
  if (delay === 0) return;

  // Prevent double-scheduling
  if (toastTimeouts.has(toastId)) {
    clearTimeout(toastTimeouts.get(toastId)!);
    toastTimeouts.delete(toastId);
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId);
    dispatch({ type: actionTypes.REMOVE_TOAST, toastId });
  }, delay);

  toastTimeouts.set(toastId, timeout);
};

/**
 * Cancel all queued removal timers.
 *
 * [FIX-4] Called by useToast's cleanup when the last subscriber
 * unmounts, preventing orphaned timers from firing against a
 * detached React tree.
 */
export const clearAllToastTimeouts = (): void => {
  toastTimeouts.forEach((timeout) => clearTimeout(timeout));
  toastTimeouts.clear();
};

// ─── Reducer ──────────────────────────────────────────────────────────────────

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case actionTypes.ADD_TOAST:
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      };

    case actionTypes.UPDATE_TOAST:
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      };

    case actionTypes.DISMISS_TOAST: {
      const { toastId } = action;
      if (toastId) {
        addToRemoveQueue(toastId);
      } else {
        state.toasts.forEach((t) => addToRemoveQueue(t.id));
      }
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? { ...t, open: false }
            : t
        ),
      };
    }

    case actionTypes.REMOVE_TOAST:
      if (action.toastId === undefined) return { ...state, toasts: [] };
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      };

    default:
      return state;
  }
};

// ─── Pub/Sub ──────────────────────────────────────────────────────────────────

const listeners: Array<(state: State) => void> = [];
let memoryState: State = { toasts: [] };

function dispatch(action: Action): void {
  memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => {
    try {
      listener(memoryState);
    } catch {
      // individual listener errors must not break the pipeline
    }
  });
}

// ─── Public toast() API ───────────────────────────────────────────────────────

export function toast({ ...props }: ToastInput): ToastReturn {
  const id = genId();

  const update = (updateProps: ToasterToast): void => {
    dispatch({ type: actionTypes.UPDATE_TOAST, toast: { ...updateProps, id } });
  };

  const dismiss = (): void => {
    dispatch({ type: actionTypes.DISMISS_TOAST, toastId: id });
  };

  dispatch({
    type: actionTypes.ADD_TOAST,
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss();
        props.onOpenChange?.(open);
      },
    },
  });

  // [FIX-5] duration === 0 → persistent; addToRemoveQueue handles the guard.
  // Infinity / null / undefined → also skip scheduling.
  if (
    props.duration !== Infinity &&
    props.duration !== null &&
    props.duration !== undefined
  ) {
    addToRemoveQueue(id, props.duration);
  } else if (props.duration === undefined) {
    // Default: schedule with TOAST_REMOVE_DELAY
    addToRemoveQueue(id, TOAST_REMOVE_DELAY);
  }

  return { id, dismiss, update };
}

// ─── useToast Hook ────────────────────────────────────────────────────────────

export function useToast(): UseToastReturn {
  const [state, setState] = React.useState<State>(memoryState);

  React.useEffect(() => {
    listeners.push(setState);

    return () => {
      // Remove this component's listener
      const index = listeners.indexOf(setState);
      if (index > -1) listeners.splice(index, 1);

      // [FIX-4] When the last subscriber unmounts, clear all pending
      // removal timers to prevent memory leaks and phantom dispatches.
      if (listeners.length === 0) {
        clearAllToastTimeouts();
      }
    };
  }, []);

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => {
      dispatch({ type: actionTypes.DISMISS_TOAST, toastId });
    },
  };
}

// ─── Convenience Functions ────────────────────────────────────────────────────

export function toastSuccess(title: string, description?: string): ToastReturn {
  return toast({ title, description, variant: "default" });
}

export function toastError(title: string, description?: string): ToastReturn {
  return toast({ title, description, variant: "destructive" });
}

export function toastInfo(title: string, description?: string): ToastReturn {
  return toast({ title, description, variant: "default" });
}

export function toastWarning(title: string, description?: string): ToastReturn {
  return toast({ title, description, variant: "default" });
}

export function dismissAllToasts(): void {
  dispatch({ type: actionTypes.DISMISS_TOAST });
}
