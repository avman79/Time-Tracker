/**
 * History page — searchable, filterable table of all time entries.
 * Includes an Export to Excel button that opens the ExportModal.
 */

import { useState, useMemo } from 'react';
import { he } from '../i18n/he';
import { ExportModal } from '../components/ExportModal';
import { useAppContext } from '../context/AppContext';

/**
 * History / entries list page.
 */
export function HistoryPage() {
  const { entries, clients, workers, isLoadingEntries, refreshEntries, addToast } = useAppContext();

  const [search, setSearch] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [filterWorker, setFilterWorker] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [showExport, setShowExport] = useState(false);

  /** Apply all active filters to the entry list */
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return entries.filter((e) => {
      if (filterClient && e.client !== filterClient) return false;
      if (filterWorker && e.worker !== filterWorker) return false;
      if (filterFrom && e.work_date < filterFrom) return false;
      if (filterTo && e.work_date > filterTo) return false;
      if (q && ![e.client, e.worker, e.description, e.entered_by].some((f) => f.toLowerCase().includes(q)))
        return false;
      return true;
    });
  }, [entries, search, filterClient, filterWorker, filterFrom, filterTo]);

  const totalHours = useMemo(() => filtered.reduce((s, e) => s + e.hours, 0), [filtered]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-gray-900">{he.history.title}</h1>
        <div className="flex gap-2">
          <button onClick={() => void refreshEntries()} className="btn-secondary text-sm p-2" title={he.refresh}>
            ↻
          </button>
          <button onClick={() => setShowExport(true)} className="btn-primary text-sm px-3 py-2">
            {he.history.exportBtn}
          </button>
        </div>
      </div>

      {/* Search */}
      <input
        type="search"
        placeholder={he.history.searchPlaceholder}
        className="input"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Filters */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">{he.history.fromDate}</label>
          <input type="date" className="input" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} />
        </div>
        <div>
          <label className="label">{he.history.toDate}</label>
          <input type="date" className="input" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} />
        </div>
        <div>
          <label className="label">{he.history.columns.client}</label>
          <select className="input" value={filterClient} onChange={(e) => setFilterClient(e.target.value)}>
            <option value="">{he.history.allClients}</option>
            {clients.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="label">{he.history.columns.worker}</label>
          <select className="input" value={filterWorker} onChange={(e) => setFilterWorker(e.target.value)}>
            <option value="">{he.history.allWorkers}</option>
            {workers.map((w) => <option key={w} value={w}>{w}</option>)}
          </select>
        </div>
      </div>

      {/* Summary bar */}
      <div className="flex gap-4 text-sm text-gray-600 bg-white rounded-lg px-4 py-2 border border-gray-200">
        <span>{he.history.entriesCount}: <strong>{filtered.length}</strong></span>
        <span>{he.history.totalHours}: <strong>{totalHours.toFixed(2)}</strong></span>
      </div>

      {/* Table / List */}
      {isLoadingEntries ? (
        <p className="text-center text-gray-400 py-8">{he.loading}</p>
      ) : filtered.length === 0 ? (
        <p className="text-center text-gray-400 py-8">{he.noData}</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((entry) => (
            <div key={entry.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-1">
              <div className="flex items-start justify-between gap-2">
                <span className="font-semibold text-gray-900">{entry.client}</span>
                <span className="text-blue-600 font-bold whitespace-nowrap">{entry.hours} ש׳</span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-gray-500">
                <span>{entry.work_date}</span>
                <span>{entry.worker}</span>
                {entry.worker_count > 1 && <span>{entry.worker_count} עובדים</span>}
              </div>
              {entry.description && (
                <p className="text-sm text-gray-700 mt-1">{entry.description}</p>
              )}
              <p className="text-xs text-gray-400">{he.history.columns.enteredBy}: {entry.entered_by}</p>
            </div>
          ))}
        </div>
      )}

      {/* Export Modal */}
      {showExport && (
        <ExportModal
          entries={entries}
          clients={clients}
          workers={workers}
          onClose={() => setShowExport(false)}
          onError={(msg) => addToast(msg, 'error')}
          onSuccess={() => addToast(he.toast.exportSuccess, 'success')}
        />
      )}
    </div>
  );
}
