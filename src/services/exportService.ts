/**
 * XLSX export service.
 * Generates a workbook with two sheets:
 *   1. Raw data (filtered by the user's selected criteria)
 *   2. Summary aggregated by client × month
 */

import * as XLSX from 'xlsx';
import { he } from '../i18n/he';
import type { TimeEntry, ExportFilters, SummaryRow } from '../types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Apply date-range, client and worker filters to a list of entries.
 * @param entries - Full unfiltered entry list
 * @param filters - User-selected filter values
 */
function applyFilters(entries: TimeEntry[], filters: ExportFilters): TimeEntry[] {
  return entries.filter((entry) => {
    if (filters.startDate && entry.work_date < filters.startDate) return false;
    if (filters.endDate && entry.work_date > filters.endDate) return false;
    if (filters.client && entry.client !== filters.client) return false;
    if (filters.worker && entry.worker !== filters.worker) return false;
    return true;
  });
}

/**
 * Aggregate filtered entries into summary rows grouped by month × client.
 * @param entries - Already filtered entry list
 */
function buildSummary(entries: TimeEntry[]): SummaryRow[] {
  const map = new Map<string, { hours: number; count: number }>();

  for (const entry of entries) {
    const month = entry.work_date.substring(0, 7);
    const key = `${month}|${entry.client}`;
    const existing = map.get(key) ?? { hours: 0, count: 0 };
    map.set(key, { hours: existing.hours + entry.hours, count: existing.count + 1 });
  }

  return Array.from(map.entries())
    .map(([key, val]) => {
      const [month, client] = key.split('|');
      return { month, client, totalHours: val.hours, entryCount: val.count };
    })
    .sort((a, b) => b.month.localeCompare(a.month) || a.client.localeCompare(b.client));
}

/**
 * Apply basic right-to-left column styling to a worksheet.
 * Sets column widths and marks each cell as RTL.
 * @param ws - The worksheet to style
 */
function styleWorksheet(ws: XLSX.WorkSheet): void {
  // Set default column widths
  ws['!cols'] = [
    { wch: 16 }, // entered_by
    { wch: 20 }, // entry_timestamp
    { wch: 18 }, // client
    { wch: 14 }, // work_date
    { wch: 8 },  // hours
    { wch: 16 }, // worker
    { wch: 12 }, // worker_count
    { wch: 40 }, // description
  ];
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Build and trigger a browser download of an XLSX workbook.
 *
 * @param entries - Full list of time entries (fetched from Sheet1)
 * @param filters - Date-range / client / worker filters to apply
 * @param filename - Optional filename for the downloaded file
 */
export function exportToXlsx(
  entries: TimeEntry[],
  filters: ExportFilters,
  filename = 'time-tracker-export.xlsx',
): void {
  const filtered = applyFilters(entries, filters);

  if (filtered.length === 0) {
    throw new Error(he.noData);
  }

  const summary = buildSummary(filtered);
  const { columnHeaders, summaryHeaders } = he.exportModal;

  // ── Sheet 1: Raw data ──
  const rawData = [
    [
      columnHeaders.enteredBy,
      columnHeaders.entryTimestamp,
      columnHeaders.client,
      columnHeaders.workDate,
      columnHeaders.hours,
      columnHeaders.worker,
      columnHeaders.workerCount,
      columnHeaders.description,
    ],
    ...filtered.map((e) => [
      e.entered_by,
      e.entry_timestamp,
      e.client,
      e.work_date,
      e.hours,
      e.worker,
      e.worker_count,
      e.description,
    ]),
  ];

  // ── Sheet 2: Summary ──
  const summaryData = [
    [
      summaryHeaders.month,
      summaryHeaders.client,
      summaryHeaders.totalHours,
      summaryHeaders.entryCount,
    ],
    ...summary.map((r) => [r.month, r.client, r.totalHours, r.entryCount]),
  ];

  const wb = XLSX.utils.book_new();

  const wsRaw = XLSX.utils.aoa_to_sheet(rawData);
  styleWorksheet(wsRaw);
  XLSX.utils.book_append_sheet(wb, wsRaw, he.exportModal.sheetRaw);

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, he.exportModal.sheetSummary);

  XLSX.writeFile(wb, filename);
}
