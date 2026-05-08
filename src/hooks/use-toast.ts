// ═══════════════════════════════════════════════════════════════
// TOAST HOOK & MANAGER
// src/hooks/use-toast.ts
// Based on shadcn/ui toast implementation
// Last Updated: 2026
// ═══════════════════════════════════════════════════════════════

import * as React from "react";
import type { ToastActionElement, ToastProps } from "@/components/ui/toast";

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

/**
 * Maximum number of toasts to display at once
 */
export const TOAST_LIMIT = 1;

/**
 * Default duration for toasts before auto-dismiss (in milliseconds)
 * 5 seconds is a good balance between visibility and non-intrusiveness
 */
export const TOAST_REMOVE_DELAY = 5000;

// ═══════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Extended toast props with unique ID and callbacks
 */
export type ToasterToast = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
  onOpenChange?: (open: boolean) => void;
};

/**
 * Action types for toast reducer (using const assertion for type safety)
 */
export const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const;

export type ActionType = typeof actionTypes;

/**
 * Union type for all possible toast actions
 */
export type Action =
  | {
      type: ActionType["ADD_TOAST"];
      toast: ToasterToast;
    }
  | {
      type: ActionType["UPDATE_TOAST"];
      toast: Partial<ToasterToast>;
    }
  | {
      type: ActionType["DISMISS_TOAST"];
      toastId?: ToasterToast["id"];
    }
  | {
      type: ActionType["REMOVE_TOAST"];
      toastId?: ToasterToast["id"];
    };

/**
 * Internal state interface for toast manager
 */
export interface State {
  toasts: ToasterToast[];
}

/**
 * Return type for the toast() function
 */
export type ToastReturn = {
  id: string;
  dismiss: () => void;
  update: (props: ToasterToast) => void;
};

/**
 * Input type for creating a new toast (without ID)
 */
export type ToastInput = Omit<ToasterToast, "id">;

/**
 * Return type for useToast hook
 */
export type UseToastReturn = State & {
  toast: (props: ToastInput) => ToastReturn;
  dismiss: (toastId?: string) => void;
};

// ═══════════════════════════════════════════════════════════════
// INTERNAL STATE & HELPERS
// ═══════════════════════════════════════════════════════════════

let count = 0;

/**
 * Generate unique ID for toast
 * Uses modulo to prevent overflow while maintaining uniqueness per session
 */
function genId(): string {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return count.toString();
}

/**
 * Map to track timeout IDs for auto-dismissing toasts
 * Prevents duplicate timeouts and allows cleanup
 */
const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Schedule a toast for removal after delay
 * @param toastId - ID of the toast to remove
 * @param delay - Optional custom delay (uses TOAST_REMOVE_DELAY if not provided)
 */
export const addToRemoveQueue = (toastId: string, delay = TOAST_REMOVE_DELAY): void => {
  // Clear existing timeout if any
  if (toastTimeouts.has(toastId)) {
    clearTimeout(toastTimeouts.get(toastId));
    toastTimeouts.delete(toastId);
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId);
    dispatch({
      type: actionTypes.REMOVE_TOAST,
      toastId: toastId,
    });
  }, delay);

  toastTimeouts.set(toastId, timeout);
};

/**
 * Clear all pending toast timeouts
 * Call this on app unmount to prevent memory leaks
 */
export const clearAllToastTimeouts = (): void => {
  toastTimeouts.forEach((timeout) => clearTimeout(timeout));
  toastTimeouts.clear();
};

// ═══════════════════════════════════════════════════════════════
// REDUCER
// ═══════════════════════════════════════════════════════════════

/**
 * Reducer function for managing toast state
 * Handles adding, updating, dismissing, and removing toasts
 */
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

      // Add to removal queue
      if (toastId) {
        addToRemoveQueue(toastId);
      } else {
        // Dismiss all toasts
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id);
        });
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
      if (action.toastId === undefined) {
        return { ...state, toasts: [] };
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      };

    default:
      return state;
  }
};

// ═══════════════════════════════════════════════════════════════
// PUB/SUB SYSTEM
// ═══════════════════════════════════════════════════════════════

/**
 * Listeners array for state subscriptions
 * Components subscribe via useToast hook
 */
const listeners: Array<(state: State) => void> = [];

/**
 * In-memory state holder
 * Acts as single source of truth for toast state
 */
let memoryState: State = { toasts: [] };

/**
 * Dispatch action to reducer and notify all listeners
 * @param action - Action to dispatch
 */
function dispatch(action: Action): void {
  memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => {
    try {
      listener(memoryState);
    } catch (error) {
    }
  });
}

// ═══════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════

/**
 * Create and display a new toast
 * @param props - Toast properties (title, description, action, etc.)
 * @returns Object with id, dismiss(), and update() methods
 * 
 * @example
 * toast({ title: "Success!", description: "Saved successfully" })
 * 
 * @example
 * const { dismiss, update } = toast({ title: "Loading..." })
 * // Later: update({ title: "Done!", variant: "success" })
 * // Or: dismiss()
 */
export function toast({ ...props }: ToastInput): ToastReturn {
  const id = genId();

  const update = (updateProps: ToasterToast): void => {
    dispatch({
      type: actionTypes.UPDATE_TOAST,
      toast: { ...updateProps, id },
    });
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

  // Auto-dismiss after delay (unless duration is explicitly set to null/infinity)
  if (props.duration !== Infinity && props.duration !== null) {
    addToRemoveQueue(id, props.duration ?? TOAST_REMOVE_DELAY);
  }

  return { id, dismiss, update };
}

/**
 * React hook for accessing toast state and methods
 * @returns State and methods for managing toasts
 * 
 * @example
 * const { toast, dismiss } = useToast()
 * 
 * @example
 * const { toasts } = useToast() // Access list of active toasts
 */
export function useToast(): UseToastReturn {
  const [state, setState] = React.useState<State>(memoryState);

  React.useEffect(() => {
    // Subscribe to state changes
    listeners.push(setState);
    
    // Cleanup: unsubscribe on unmount
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
    // Empty dependency array - we only want to subscribe once
  }, []);

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => {
      dispatch({ type: actionTypes.DISMISS_TOAST, toastId });
    },
  };
}

// ═══════════════════════════════════════════════════════════════
// CONVENIENCE FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Show a success toast
 */
export function toastSuccess(title: string, description?: string): ToastReturn {
  return toast({
    title,
    description,
    variant: "default", // or "success" if your toast component supports it
  });
}

/**
 * Show an error toast
 */
export function toastError(title: string, description?: string): ToastReturn {
  return toast({
    title,
    description,
    variant: "destructive",
  });
}

/**
 * Show an info toast
 */
export function toastInfo(title: string, description?: string): ToastReturn {
  return toast({
    title,
    description,
    variant: "default",
  });
}

/**
 * Show a warning toast
 */
export function toastWarning(title: string, description?: string): ToastReturn {
  return toast({
    title,
    description,
    variant: "default", // or "warning" if supported
  });
}

/**
 * Dismiss all active toasts
 */
export function dismissAllToasts(): void {
  dispatch({ type: actionTypes.DISMISS_TOAST });
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS SUMMARY
// ═══════════════════════════════════════════════════════════════

/**
 * Main exports:
 * 
 * Constants:
 * - TOAST_LIMIT: Max toasts to display
 * - TOAST_REMOVE_DELAY: Default auto-dismiss delay (ms)
 * 
 * Types:
 * - ToasterToast, ToastInput, ToastReturn, UseToastReturn
 * - ActionType, Action, State
 * 
 * Functions:
 * - toast(): Create and show a toast
 * - useToast(): Hook for accessing toast state
 * - dismissAllToasts(): Dismiss all active toasts
 * - toastSuccess/Error/Info/Warning(): Convenience functions
 * - addToRemoveQueue(), clearAllToastTimeouts(): Internal helpers
 * 
 * Reducer:
 * - reducer(): State reducer for toast management
 * - actionTypes: Action type constants
 */