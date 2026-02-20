/**
 * Toast notification container and individual toast component.
 * Renders a stack of auto-dismissing notifications at the top of the screen.
 */

import type { ToastMessage } from '../types';

/** Color classes for each toast severity level */
const VARIANTS: Record<ToastMessage['type'], string> = {
  success: 'bg-green-600 text-white',
  error: 'bg-red-600 text-white',
  info: 'bg-blue-600 text-white',
  warning: 'bg-amber-500 text-white',
};

/** Icon for each severity level */
const ICONS: Record<ToastMessage['type'], string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
  warning: '⚠',
};

interface ToastItemProps {
  toast: ToastMessage;
  onRemove: (id: string) => void;
}

/** A single dismissible toast notification */
function ToastItem({ toast, onRemove }: ToastItemProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-fade-in ${VARIANTS[toast.type]}`}
    >
      <span aria-hidden="true">{ICONS[toast.type]}</span>
      <span className="flex-1">{toast.message}</span>
      <button
        onClick={() => onRemove(toast.id)}
        aria-label="סגור"
        className="opacity-75 hover:opacity-100 text-lg leading-none"
      >
        ×
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

/**
 * Container that renders all active toasts in a fixed overlay.
 */
export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-4 end-4 z-50 flex flex-col gap-2 w-full max-w-sm pointer-events-none"
      aria-label="התראות"
    >
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} onRemove={onRemove} />
        </div>
      ))}
    </div>
  );
}
