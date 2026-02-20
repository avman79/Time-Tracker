/**
 * Browser Notification service.
 *
 * Uses the Web Notifications API to show in-browser notifications.
 * Note: notifications can only be shown while the app is open in a browser tab.
 * For true background push notifications a server-side push subscription would be required.
 */

import { he } from '../i18n/he';

// ─── Permission ──────────────────────────────────────────────────────────────

/**
 * Request notification permission from the browser.
 * @returns `true` if permission was granted, `false` otherwise.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;

  const result = await Notification.requestPermission();
  return result === 'granted';
}

/**
 * Check whether notification permission has already been granted.
 */
export function hasNotificationPermission(): boolean {
  return 'Notification' in window && Notification.permission === 'granted';
}

// ─── Display ─────────────────────────────────────────────────────────────────

/**
 * Show a browser notification reminding the user to log their hours.
 * Does nothing if permission has not been granted.
 */
export function showReminderNotification(): void {
  if (!hasNotificationPermission()) return;

  const notification = new Notification(he.reminder.notificationTitle, {
    body: he.reminder.notificationBody,
    icon: '/icon.svg',
    badge: '/icon.svg',
    lang: 'he',
    dir: 'rtl',
    tag: 'time-tracker-reminder', // deduplicates repeated reminders
  });

  // Close the notification automatically after 8 seconds
  setTimeout(() => notification.close(), 8_000);

  // Navigate to the app when the notification is clicked
  notification.onclick = () => {
    window.focus();
    notification.close();
  };
}

// ─── Reminder Check ───────────────────────────────────────────────────────────

/**
 * Determine whether a reminder should be shown based on the last entry timestamp
 * and the user's reminder configuration.
 *
 * @param lastEntryTimestamp - ISO timestamp of the last saved entry, or null if none
 * @param value - Numeric threshold (e.g. 2)
 * @param unit - 'hours' or 'days'
 * @returns `true` if the threshold has been exceeded
 */
export function isReminderDue(
  lastEntryTimestamp: string | null,
  value: number,
  unit: 'hours' | 'days',
): boolean {
  if (!lastEntryTimestamp) return true; // never logged → always remind

  const lastMs = new Date(lastEntryTimestamp).getTime();
  if (isNaN(lastMs)) return false;

  const thresholdMs = unit === 'hours' ? value * 60 * 60 * 1000 : value * 24 * 60 * 60 * 1000;
  return Date.now() - lastMs > thresholdMs;
}
