/**
 * Application-wide React context.
 * Provides shared state (user, sheets data, toasts, reminders) to all pages.
 */

import { createContext, useContext, type ReactNode } from 'react';
import { useUser, type UseUserReturn } from '../hooks/useUser';
import { useToast, type UseToastReturn } from '../hooks/useToast';
import { useReminders, type UseRemindersReturn } from '../hooks/useReminders';
import { useGoogleSheets, type UseGoogleSheetsReturn } from '../hooks/useGoogleSheets';

interface AppContextValue extends UseUserReturn, UseToastReturn, UseRemindersReturn, UseGoogleSheetsReturn {}

const AppContext = createContext<AppContextValue | null>(null);

/**
 * Wrap the application in AppProvider to supply all context values.
 */
export function AppProvider({ children }: { children: ReactNode }) {
  const userState = useUser();
  const toastState = useToast();
  const reminderState = useReminders();
  const sheetsState = useGoogleSheets((msg) => toastState.addToast(msg, 'error'));

  const value: AppContextValue = {
    ...userState,
    ...toastState,
    ...reminderState,
    ...sheetsState,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

/**
 * Access the global application context.
 * Must be used inside an AppProvider.
 */
export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}
