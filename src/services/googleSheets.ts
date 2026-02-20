/**
 * Google Sheets API v4 service layer.
 *
 * READ  operations use the public API key (sheet must be shared as "Anyone with link can view").
 * WRITE operations use an OAuth 2.0 Bearer token obtained via Google Identity Services (GIS).
 */

import { config } from '../config';
import type { TimeEntry, SummaryRow } from '../types';

const BASE_URL = 'https://sheets.googleapis.com/v4/spreadsheets';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Build the full Sheets API URL for a named range read operation.
 * @param range - A1 notation range, e.g. "Sheet1!A:H"
 */
function readUrl(range: string): string {
  return `${BASE_URL}/${config.sheetId}/values/${encodeURIComponent(range)}?key=${config.apiKey}`;
}

/**
 * Build the append URL for a sheet tab.
 * @param range - The target range/tab, e.g. "Sheet1"
 */
function appendUrl(range: string): string {
  return (
    `${BASE_URL}/${config.sheetId}/values/${encodeURIComponent(range)}:append` +
    `?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`
  );
}

/**
 * Build the batch-update URL for overwriting a range.
 * @param range - Target range in A1 notation
 */
function updateUrl(range: string): string {
  return (
    `${BASE_URL}/${config.sheetId}/values/${encodeURIComponent(range)}` +
    `?valueInputOption=USER_ENTERED`
  );
}

/**
 * Perform an authenticated fetch and parse the JSON response.
 * Throws an error with the API's message if the response is not OK.
 */
async function authFetch(
  url: string,
  method: 'POST' | 'PUT',
  token: string,
  body: unknown,
): Promise<unknown> {
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const message = (err as { error?: { message?: string } })?.error?.message ?? `HTTP ${response.status}`;
    throw new Error(message);
  }

  return response.json();
}

// ─── Read Operations ──────────────────────────────────────────────────────────

/**
 * Read a sheet range using the API key (public/read-only access).
 * @param range - A1 notation range
 * @returns 2-D array of string values, or empty array if the range is empty
 */
async function readRange(range: string): Promise<string[][]> {
  const response = await fetch(readUrl(range));
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const message = (err as { error?: { message?: string } })?.error?.message ?? `HTTP ${response.status}`;
    throw new Error(message);
  }
  const data = await response.json() as { values?: string[][] };
  return data.values ?? [];
}

/**
 * Fetch the list of clients from Sheet3, column A.
 * Skips the header row.
 */
export async function fetchClients(): Promise<string[]> {
  const rows = await readRange(`${config.sheets.clients}!A:A`);
  return rows.slice(1).map((r) => r[0]).filter(Boolean);
}

/**
 * Fetch the list of workers from Sheet4, column A.
 * Skips the header row.
 */
export async function fetchWorkers(): Promise<string[]> {
  const rows = await readRange(`${config.sheets.users}!A:A`);
  return rows.slice(1).map((r) => r[0]).filter(Boolean);
}

/**
 * Fetch all time entries from Sheet1.
 * Expects columns: entered_by, entry_timestamp, client, work_date, hours, worker, worker_count, description
 * Skips the header row.
 */
export async function fetchEntries(): Promise<TimeEntry[]> {
  const rows = await readRange(`${config.sheets.entries}!A:H`);
  return rows.slice(1).map((row, index) => ({
    id: String(index + 2), // +2 accounts for header row and 1-based index
    entered_by: row[0] ?? '',
    entry_timestamp: row[1] ?? '',
    client: row[2] ?? '',
    work_date: row[3] ?? '',
    hours: parseFloat(row[4] ?? '0') || 0,
    worker: row[5] ?? '',
    worker_count: parseInt(row[6] ?? '1', 10) || 1,
    description: row[7] ?? '',
  }));
}

// ─── Write Operations ─────────────────────────────────────────────────────────

/**
 * Append a new time entry to Sheet1.
 * @param entry - The entry to append (id and entry_timestamp are set automatically)
 * @param token - A valid OAuth 2.0 Bearer token with spreadsheets scope
 */
export async function appendEntry(
  entry: Omit<TimeEntry, 'id'>,
  token: string,
): Promise<void> {
  const row = [
    entry.entered_by,
    entry.entry_timestamp,
    entry.client,
    entry.work_date,
    entry.hours,
    entry.worker,
    entry.worker_count,
    entry.description,
  ];

  await authFetch(appendUrl(config.sheets.entries), 'POST', token, {
    values: [row],
  });
}

/**
 * Append a new client name to Sheet3, column A.
 * @param clientName - The client name to add
 * @param token - OAuth 2.0 Bearer token
 */
export async function appendClient(clientName: string, token: string): Promise<void> {
  await authFetch(appendUrl(config.sheets.clients), 'POST', token, {
    values: [[clientName]],
  });
}

/**
 * Append a new worker name to Sheet4, column A.
 * @param workerName - The worker name to add
 * @param token - OAuth 2.0 Bearer token
 */
export async function appendWorker(workerName: string, token: string): Promise<void> {
  await authFetch(appendUrl(config.sheets.users), 'POST', token, {
    values: [[workerName]],
  });
}

// ─── Summary Refresh ──────────────────────────────────────────────────────────

/**
 * Recompute and overwrite the summary in Sheet2.
 * Groups all entries by (YYYY-MM month, client) and writes aggregated totals.
 * @param entries - The full list of entries from Sheet1
 * @param token - OAuth 2.0 Bearer token
 */
export async function refreshSummary(entries: TimeEntry[], token: string): Promise<void> {
  const summaryMap = new Map<string, { hours: number; count: number }>();

  for (const entry of entries) {
    const month = entry.work_date.substring(0, 7);
    const key = `${month}|${entry.client}`;
    const existing = summaryMap.get(key) ?? { hours: 0, count: 0 };
    summaryMap.set(key, {
      hours: existing.hours + entry.hours,
      count: existing.count + 1,
    });
  }

  const summaryRows: SummaryRow[] = Array.from(summaryMap.entries())
    .map(([key, value]) => {
      const [month, client] = key.split('|');
      return { month, client, totalHours: value.hours, entryCount: value.count };
    })
    .sort((a, b) => b.month.localeCompare(a.month) || a.client.localeCompare(b.client));

  // Write header + data rows to Sheet2
  const rows = [
    ['חודש', 'לקוח', 'סה״כ שעות', 'מספר רשומות'],
    ...summaryRows.map((r) => [r.month, r.client, r.totalHours, r.entryCount]),
  ];

  const range = `${config.sheets.summary}!A1`;
  await authFetch(updateUrl(range), 'PUT', token, {
    range,
    values: rows,
    majorDimension: 'ROWS',
  });
}

/**
 * Ensure Sheet1 has the correct header row (idempotent).
 * Should be called once when initialising a fresh spreadsheet.
 * @param token - OAuth 2.0 Bearer token
 */
export async function ensureHeaders(token: string): Promise<void> {
  const existingHeaders = await readRange(`${config.sheets.entries}!A1:H1`);
  if (existingHeaders.length > 0 && existingHeaders[0].length > 0) return;

  const headers = [
    ['נרשם על ידי', 'זמן רישום', 'לקוח', 'תאריך עבודה', 'שעות', 'עובד', 'מספר עובדים', 'תיאור'],
  ];
  const range = `${config.sheets.entries}!A1`;
  await authFetch(updateUrl(range), 'PUT', token, {
    range,
    values: headers,
    majorDimension: 'ROWS',
  });

  // Sheet3 header
  await authFetch(
    updateUrl(`${config.sheets.clients}!A1`),
    'PUT',
    token,
    { range: `${config.sheets.clients}!A1`, values: [['לקוח']], majorDimension: 'ROWS' },
  );

  // Sheet4 header
  await authFetch(
    updateUrl(`${config.sheets.users}!A1`),
    'PUT',
    token,
    { range: `${config.sheets.users}!A1`, values: [['עובד']], majorDimension: 'ROWS' },
  );
}
