/**
 * Hook that manages the reminder configuration and checks whether a reminder is due.
 * Persists config in localStorage and fires a browser notification when appropriate.
 */

import { useState, useEffect, useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { isReminderDue, showReminderNotification } from '../services/notificationService';
import { config } from '../config';
import type { ReminderConfig } from '../types';

const DEFAULT_CONFIG: ReminderConfig = { enabled: false, value: 24, unit: 'hours' };
const CHECK_INTERVAL_MS = 5 * 60 * 1000; // re-check every 5 minutes while app is open

/** Return type for the useReminders hook */
export interface UseRemindersReturn {
  reminderConfig: ReminderConfig;
  setReminderConfig: (cfg: ReminderConfig) => void;
  /** Whether a reminder is currently overdue */
  reminderDue: boolean;
  /** ISO timestamp of the last recorded entry */
  lastEntryTimestamp: string | null;
  /** Call this after every successful entry save to update the last-entry clock */
  recordEntry: () => void;
  /** Dismiss the in-app reminder banner until the next threshold passes */
  dismissReminder: () => void;
}

/**
 * Manage reminder state and periodic checks.
 */
export function useReminders(): UseRemindersReturn {
  const [reminderConfig, setReminderConfig] = useLocalStorage<ReminderConfig>(
    config.storageKeys.reminder,
    DEFAULT_CONFIG,
  );

  const [lastEntryTimestamp, setLastEntryTimestamp] = useLocalStorage<string | null>(
    config.storageKeys.lastEntry,
    null,
  );

  const [reminderDue, setReminderDue] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  /**
   * Evaluate whether the reminder threshold has been exceeded.
   */
  const checkReminder = useCallback(() => {
    if (!reminderConfig.enabled || dismissed) {
      setReminderDue(false);
      return;
    }
    const due = isReminderDue(lastEntryTimestamp, reminderConfig.value, reminderConfig.unit);
    setReminderDue(due);
    if (due) showReminderNotification();
  }, [reminderConfig, lastEntryTimestamp, dismissed]);

  // Run once on mount and then on an interval
  useEffect(() => {
    checkReminder();
    const id = setInterval(checkReminder, CHECK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [checkReminder]);

  // Re-check whenever config changes
  useEffect(() => {
    setDismissed(false);
    checkReminder();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reminderConfig]);

  /** Save the current timestamp as the last entry time */
  const recordEntry = useCallback(() => {
    const now = new Date().toISOString();
    setLastEntryTimestamp(now);
    setReminderDue(false);
    setDismissed(false);
  }, [setLastEntryTimestamp]);

  /** Hide the banner until the next threshold cycle */
  const dismissReminder = useCallback(() => {
    setDismissed(true);
    setReminderDue(false);
  }, []);

  return {
    reminderConfig,
    setReminderConfig,
    reminderDue,
    lastEntryTimestamp,
    recordEntry,
    dismissReminder,
  };
}
