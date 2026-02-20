/** Application-wide TypeScript interfaces and types */

/** A single time-entry record stored in Sheet1 */
export interface TimeEntry {
  /** Stringified row index used as a local identifier */
  id: string;
  /** Display name of the user who created this entry */
  entered_by: string;
  /** ISO-8601 timestamp of when the entry was submitted */
  entry_timestamp: string;
  /** Client name */
  client: string;
  /** Work date in YYYY-MM-DD format */
  work_date: string;
  /** Decimal hours worked (e.g. 1.5 = 1h 30m) */
  hours: number;
  /** Name of the worker */
  worker: string;
  /** Number of workers involved in the task */
  worker_count: number;
  /** Free-text description of the work done */
  description: string;
}

/** Reminder configuration stored in localStorage */
export interface ReminderConfig {
  /** Whether the reminder feature is enabled */
  enabled: boolean;
  /** Numeric threshold before the reminder fires */
  value: number;
  /** Unit of the threshold */
  unit: 'hours' | 'days';
}

/** Toast notification payload */
export interface ToastMessage {
  /** Unique identifier for the toast */
  id: string;
  /** Hebrew display text */
  message: string;
  /** Visual severity level */
  type: 'success' | 'error' | 'info' | 'warning';
  /** Auto-dismiss after this many ms (default 4000) */
  duration?: number;
}

/** Filters applied to the history view and XLSX export */
export interface ExportFilters {
  startDate: string;
  endDate: string;
  client: string;
  worker: string;
}

/** Aggregated summary row written to Sheet2 */
export interface SummaryRow {
  month: string;       // YYYY-MM
  client: string;
  totalHours: number;
  entryCount: number;
}

/** Structured result returned by the voice-parsing utility */
export interface VoiceParseResult {
  client?: string;
  hours?: number;
  description?: string;
  work_date?: string;
}
