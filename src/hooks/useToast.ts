/**
 * Hook that manages a queue of toast notification messages.
 * Toasts auto-dismiss after their configured duration.
 */

import { useState, useCallback } from 'react';
import type { ToastMessage } from '../types';

const DEFAULT_DURATION = 4000;

/** Return type for the useToast hook */
export interface UseToastReturn {
  toasts: ToastMessage[];
  addToast: (message: string, type: ToastMessage['type'], duration?: number) => void;
  removeToast: (id: string) => void;
}

/**
 * Manage a list of auto-dismissing toast notifications.
 */
export function useToast(): UseToastReturn {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  /**
   * Remove a toast by its id.
   * @param id - Toast identifier
   */
  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  /**
   * Add a new toast message to the queue.
   * @param message - Hebrew display text
   * @param type - Severity level
   * @param duration - Auto-dismiss delay in ms (default 4000)
   */
  const addToast = useCallback(
    (message: string, type: ToastMessage['type'], duration = DEFAULT_DURATION) => {
      const id = `toast-${Date.now()}-${Math.random()}`;
      const toast: ToastMessage = { id, message, type, duration };

      setToasts((prev) => [...prev, toast]);
      setTimeout(() => removeToast(id), duration);
    },
    [removeToast],
  );

  return { toasts, addToast, removeToast };
}
