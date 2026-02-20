/**
 * Modal dialog for configuring and triggering the XLSX export.
 * Allows filtering by date range, client and worker before exporting.
 */

import { useState } from 'react';
import { format } from 'date-fns';
import { he } from '../i18n/he';
import { exportToXlsx } from '../services/exportService';
import type { TimeEntry, ExportFilters } from '../types';

interface ExportModalProps {
  entries: TimeEntry[];
  clients: string[];
  workers: string[];
  onClose: () => void;
  onError: (msg: string) => void;
  onSuccess: () => void;
}

/**
 * A full-screen modal with filter controls for the XLSX export.
 */
export function ExportModal({
  entries,
  clients,
  workers,
  onClose,
  onError,
  onSuccess,
}: ExportModalProps) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [filters, setFilters] = useState<ExportFilters>({
    startDate: '',
    endDate: today,
    client: '',
    worker: '',
  });

  function handleExport() {
    try {
      exportToXlsx(entries, filters);
      onSuccess();
      onClose();
    } catch (err) {
      onError(err instanceof Error ? err.message : he.toast.exportError);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">{he.exportModal.title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* From date */}
          <div>
            <label className="label">{he.exportModal.fromDate}</label>
            <input
              type="date"
              className="input"
              value={filters.startDate}
              onChange={(e) => setFilters((f) => ({ ...f, startDate: e.target.value }))}
            />
          </div>

          {/* To date */}
          <div>
            <label className="label">{he.exportModal.toDate}</label>
            <input
              type="date"
              className="input"
              value={filters.endDate}
              onChange={(e) => setFilters((f) => ({ ...f, endDate: e.target.value }))}
            />
          </div>
        </div>

        {/* Client filter */}
        <div>
          <label className="label">{he.exportModal.client}</label>
          <select
            className="input"
            value={filters.client}
            onChange={(e) => setFilters((f) => ({ ...f, client: e.target.value }))}
          >
            <option value="">{he.exportModal.allClients}</option>
            {clients.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Worker filter */}
        <div>
          <label className="label">{he.exportModal.worker}</label>
          <select
            className="input"
            value={filters.worker}
            onChange={(e) => setFilters((f) => ({ ...f, worker: e.target.value }))}
          >
            <option value="">{he.exportModal.allWorkers}</option>
            {workers.map((w) => <option key={w} value={w}>{w}</option>)}
          </select>
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={handleExport} className="btn-primary flex-1">
            {he.exportModal.exportBtn}
          </button>
          <button onClick={onClose} className="btn-secondary flex-1">
            {he.cancel}
          </button>
        </div>
      </div>
    </div>
  );
}
