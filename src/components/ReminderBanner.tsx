/**
 * In-app reminder banner displayed when the user hasn't logged hours recently.
 * Appears as a colored stripe below the navigation header.
 */

import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { he } from '../i18n/he';

interface ReminderBannerProps {
  /** ISO timestamp of the last recorded entry */
  lastEntryTimestamp: string | null;
  /** Callback to hide the banner for the current session */
  onDismiss: () => void;
}

/**
 * A dismissible amber banner reminding the user to log their hours.
 */
export function ReminderBanner({ lastEntryTimestamp, onDismiss }: ReminderBannerProps) {
  const navigate = useNavigate();

  const lastDate = lastEntryTimestamp
    ? format(new Date(lastEntryTimestamp), 'dd/MM/yyyy HH:mm')
    : null;

  return (
    <div
      role="alert"
      className="bg-amber-400 text-amber-900 text-sm px-4 py-2 flex items-center justify-between gap-2"
    >
      <span className="font-medium">
        {he.reminder.bannerPrefix}
        {lastDate ? ` ${lastDate} ` : ' '}
        {he.reminder.bannerSuffix}
      </span>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => navigate('/')}
          className="underline font-semibold text-amber-900 hover:text-amber-950"
        >
          {he.reminder.logNow}
        </button>
        <button
          onClick={onDismiss}
          aria-label={he.reminder.dismiss}
          className="text-amber-900 hover:text-amber-950 text-lg leading-none"
        >
          ×
        </button>
      </div>
    </div>
  );
}
