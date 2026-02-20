/**
 * Application shell: sticky header, optional reminder banner, bottom navigation,
 * toast overlay, and FAB. All page content is rendered in the main slot.
 */

import { NavLink } from 'react-router-dom';
import { useRef } from 'react';
import { he } from '../i18n/he';
import { ToastContainer } from './Toast';
import { ReminderBanner } from './ReminderBanner';
import { FAB } from './FAB';
import { useAppContext } from '../context/AppContext';

/** SVG icons for bottom navigation */
const HomeIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);
const HistoryIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const SettingsIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const NAV_ITEMS = [
  { to: '/',         label: he.nav.home,     Icon: HomeIcon },
  { to: '/history',  label: he.nav.history,  Icon: HistoryIcon },
  { to: '/settings', label: he.nav.settings, Icon: SettingsIcon },
];

interface LayoutProps {
  children: React.ReactNode;
}

/**
 * Wraps all page content with the shared shell.
 */
export function Layout({ children }: LayoutProps) {
  const { toasts, removeToast, reminderDue, lastEntryTimestamp, dismissReminder, username } =
    useAppContext();
  const formRef = useRef<(() => void) | null>(null);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* ── Header ── */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="font-bold text-blue-700 text-lg">{he.appName}</span>
          {username && (
            <span className="text-sm text-gray-500 truncate max-w-[140px]">{username}</span>
          )}
        </div>
      </header>

      {/* ── Reminder Banner ── */}
      {reminderDue && (
        <ReminderBanner
          lastEntryTimestamp={lastEntryTimestamp}
          onDismiss={dismissReminder}
        />
      )}

      {/* ── Main Content ── */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6 pb-24">
        {children}
      </main>

      {/* ── Bottom Navigation ── */}
      <nav className="fixed bottom-0 inset-x-0 z-30 bg-white border-t border-gray-200 shadow-t">
        <div className="max-w-2xl mx-auto flex">
          {NAV_ITEMS.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs transition-colors
                 ${isActive ? 'text-blue-600 font-semibold' : 'text-gray-500 hover:text-gray-800'}`
              }
            >
              <Icon />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* ── FAB ── */}
      <FAB onHomePress={() => formRef.current?.()} />

      {/* ── Toast Overlay ── */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
