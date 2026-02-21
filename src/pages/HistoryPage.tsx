/**
 * History page — searchable, filterable, sortable list of all time entries.
 *
 * Features:
 *  - Sequential entry numbers in the displayed order
 *  - Click-to-expand with Edit / Duplicate / Delete actions
 *  - Inline edit form (replaces card while editing)
 *  - Hebrew delete confirmation
 *  - Quick filters: this week / this month / all
 *  - Month summary (total hours for the current calendar month)
 *  - Sort by date, client, or hours (toggle asc/desc)
 *  - Per-client hour breakdown at the bottom
 */

import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { he } from '../i18n/he';
import { ExportModal } from '../components/ExportModal';
import { useAppContext } from '../context/AppContext';
import type { TimeEntry } from '../types';

// ─── Local types ──────────────────────────────────────────────────────────────

interface EditForm {
  client: string;
  work_date: string;
  hours: string;
  worker: string;
  worker_count: string;
  description: string;
}

type SortField = 'date' | 'client' | 'hours';
type QuickFilter = 'all' | 'week' | 'month';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isoToday(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

function isoWeekStart(): string {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay()); // Sunday
  return format(d, 'yyyy-MM-dd');
}

function isoMonthStart(): string {
  const d = new Date();
  return format(new Date(d.getFullYear(), d.getMonth(), 1), 'yyyy-MM-dd');
}

// ─── Component ────────────────────────────────────────────────────────────────

export function HistoryPage() {
  const {
    entries, clients, workers,
    isLoadingEntries, refreshEntries,
    addEntry, deleteEntry, updateEntry,
    isSubmitting, addToast, username,
  } = useAppContext();

  // ── Filter state ────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [filterWorker, setFilterWorker] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');

  // ── Sort state ──────────────────────────────────────────────────────────────
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // ── UI state ────────────────────────────────────────────────────────────────
  const [showExport, setShowExport] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);

  // ── Quick filter ────────────────────────────────────────────────────────────
  function applyQuickFilter(type: QuickFilter) {
    setQuickFilter(type);
    if (type === 'all') {
      setFilterFrom('');
      setFilterTo('');
    } else if (type === 'week') {
      setFilterFrom(isoWeekStart());
      setFilterTo(isoToday());
    } else {
      setFilterFrom(isoMonthStart());
      setFilterTo(isoToday());
    }
  }

  // ── Sort ────────────────────────────────────────────────────────────────────
  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir(field === 'date' ? 'desc' : 'asc');
    }
  }

  function sortIcon(field: SortField): string {
    if (sortField !== field) return '';
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  }

  // ── Derived data ────────────────────────────────────────────────────────────
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

  const sortedEntries = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'date') cmp = a.work_date.localeCompare(b.work_date);
      else if (sortField === 'client') cmp = a.client.localeCompare(b.client, 'he');
      else cmp = a.hours - b.hours;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortField, sortDir]);

  const totalHours = useMemo(() => filtered.reduce((s, e) => s + e.hours, 0), [filtered]);

  /** Always reflects the current calendar month regardless of active filters. */
  const currentMonthTotal = useMemo(() => {
    const month = format(new Date(), 'yyyy-MM');
    return entries
      .filter((e) => e.work_date.startsWith(month))
      .reduce((s, e) => s + e.hours, 0);
  }, [entries]);

  const hoursPerClient = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of filtered) map.set(e.client, (map.get(e.client) ?? 0) + e.hours);
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  // ── Edit helpers ────────────────────────────────────────────────────────────
  function setEditField<K extends keyof EditForm>(k: K, v: EditForm[K]) {
    setEditForm((f) => (f ? { ...f, [k]: v } : f));
  }

  function startEdit(entry: TimeEntry) {
    setEditingId(entry.id);
    setEditForm({
      client: entry.client,
      work_date: entry.work_date,
      hours: String(entry.hours),
      worker: entry.worker,
      worker_count: String(entry.worker_count),
      description: entry.description,
    });
    setExpandedId(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(null);
  }

  async function handleSaveEdit() {
    if (!editingId || !editForm) return;
    const orig = entries.find((e) => e.id === editingId);
    if (!orig) return;
    try {
      await updateEntry({
        ...orig,
        client: editForm.client,
        work_date: editForm.work_date,
        hours: parseFloat(editForm.hours) || 0,
        worker: editForm.worker,
        worker_count: parseInt(editForm.worker_count, 10) || 1,
        description: editForm.description,
      });
      addToast(he.toast.entryUpdated, 'success');
      cancelEdit();
    } catch (err) {
      addToast(err instanceof Error ? err.message : he.toast.entrySaveError, 'error');
    }
  }

  async function handleDelete(entry: TimeEntry) {
    if (!window.confirm(he.history.confirmDelete)) return;
    try {
      await deleteEntry(entry.id);
      addToast(he.toast.entryDeleted, 'success');
      setExpandedId(null);
    } catch (err) {
      addToast(err instanceof Error ? err.message : he.toast.entrySaveError, 'error');
    }
  }

  async function handleDuplicate(entry: TimeEntry) {
    try {
      await addEntry({
        entered_by: username,
        client: entry.client,
        work_date: entry.work_date,
        hours: entry.hours,
        worker: entry.worker,
        worker_count: entry.worker_count,
        description: entry.description,
      });
      addToast(he.toast.entryDuplicated, 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : he.toast.entrySaveError, 'error');
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* ── Header ── */}
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

      {/* ── Month summary ── */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-2.5 text-sm text-blue-800">
        {he.history.monthSummary}:{' '}
        <strong className="text-blue-900 text-base">{currentMonthTotal.toFixed(2)}</strong>
        {' '}ש׳
      </div>

      {/* ── Quick filters ── */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'month', 'week'] as QuickFilter[]).map((type) => (
          <button
            key={type}
            onClick={() => applyQuickFilter(type)}
            className={`text-sm px-3 py-1 rounded-full border transition-colors ${
              quickFilter === type
                ? 'bg-blue-600 text-white border-blue-600'
                : 'border-gray-300 text-gray-600 hover:border-gray-400 bg-white'
            }`}
          >
            {type === 'all'
              ? he.history.allTime
              : type === 'month'
              ? he.history.thisMonth
              : he.history.thisWeek}
          </button>
        ))}
      </div>

      {/* ── Sort controls ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-gray-500">{he.history.sortBy}:</span>
        {(['date', 'client', 'hours'] as SortField[]).map((field) => (
          <button
            key={field}
            onClick={() => handleSort(field)}
            className={`text-xs px-2.5 py-1 rounded border transition-colors ${
              sortField === field
                ? 'border-blue-500 text-blue-700 bg-blue-50 font-semibold'
                : 'border-gray-200 text-gray-500 bg-white hover:border-gray-300'
            }`}
          >
            {field === 'date'
              ? he.history.columns.date
              : field === 'client'
              ? he.history.columns.client
              : he.history.columns.hours}
            {sortIcon(field)}
          </button>
        ))}
      </div>

      {/* ── Search ── */}
      <input
        type="search"
        placeholder={he.history.searchPlaceholder}
        className="input"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* ── Date / Client / Worker filters ── */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">{he.history.fromDate}</label>
          <input
            type="date"
            className="input"
            value={filterFrom}
            onChange={(e) => { setFilterFrom(e.target.value); setQuickFilter('all'); }}
          />
        </div>
        <div>
          <label className="label">{he.history.toDate}</label>
          <input
            type="date"
            className="input"
            value={filterTo}
            onChange={(e) => { setFilterTo(e.target.value); setQuickFilter('all'); }}
          />
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

      {/* ── Results summary bar ── */}
      <div className="flex gap-4 text-sm text-gray-600 bg-white rounded-lg px-4 py-2 border border-gray-200">
        <span>{he.history.entriesCount}: <strong>{filtered.length}</strong></span>
        <span>{he.history.totalHours}: <strong>{totalHours.toFixed(2)}</strong></span>
      </div>

      {/* ── Entry list ── */}
      {isLoadingEntries ? (
        <p className="text-center text-gray-400 py-8">{he.loading}</p>
      ) : sortedEntries.length === 0 ? (
        <p className="text-center text-gray-400 py-8">{he.noData}</p>
      ) : (
        <div className="space-y-2">
          {sortedEntries.map((entry, idx) => {
            const isExpanded = expandedId === entry.id;
            const isEditing = editingId === entry.id;

            /* ── Inline edit form ── */
            if (isEditing && editForm) {
              return (
                <div key={entry.id} className="bg-white rounded-xl shadow-sm border border-blue-300 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 font-mono">#{idx + 1}</span>
                    <span className="text-sm font-semibold text-blue-700">{he.history.editTitle}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">{he.form.client}</label>
                      <select className="input" value={editForm.client} onChange={(e) => setEditField('client', e.target.value)}>
                        <option value="">{he.form.clientPlaceholder}</option>
                        {clients.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label">{he.form.workDate}</label>
                      <input type="date" className="input" value={editForm.work_date} onChange={(e) => setEditField('work_date', e.target.value)} />
                    </div>
                    <div>
                      <label className="label">{he.form.hours}</label>
                      <input type="number" step="0.25" min="0" max="24" className="input" value={editForm.hours} onChange={(e) => setEditField('hours', e.target.value)} />
                    </div>
                    <div>
                      <label className="label">{he.form.worker}</label>
                      <select className="input" value={editForm.worker} onChange={(e) => setEditField('worker', e.target.value)}>
                        <option value="">{he.form.workerPlaceholder}</option>
                        {workers.map((w) => <option key={w} value={w}>{w}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="label">{he.form.workerCount}</label>
                    <input type="number" min="1" className="input" value={editForm.worker_count} onChange={(e) => setEditField('worker_count', e.target.value)} />
                  </div>

                  <div>
                    <label className="label">{he.form.description}</label>
                    <textarea rows={2} className="input resize-none" value={editForm.description} onChange={(e) => setEditField('description', e.target.value)} />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => void handleSaveEdit()}
                      disabled={isSubmitting}
                      className="btn-primary flex-1 text-sm py-1.5"
                    >
                      {isSubmitting ? he.loading : he.save}
                    </button>
                    <button onClick={cancelEdit} className="btn-secondary text-sm py-1.5 px-4">
                      {he.cancel}
                    </button>
                  </div>
                </div>
              );
            }

            /* ── Normal entry card ── */
            return (
              <div key={entry.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Clickable card body */}
                <div
                  className="p-4 space-y-1 cursor-pointer hover:bg-gray-50 transition-colors select-none"
                  onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs text-gray-300 font-mono shrink-0">{idx + 1}.</span>
                      <span className="font-semibold text-gray-900 truncate">{entry.client}</span>
                    </div>
                    <span className="text-blue-600 font-bold whitespace-nowrap shrink-0">{entry.hours} ש׳</span>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-gray-500 pr-5">
                    <span>{entry.work_date}</span>
                    <span>{entry.worker}</span>
                    {entry.worker_count > 1 && <span>{entry.worker_count} עובדים</span>}
                  </div>

                  {entry.description && (
                    <p className="text-sm text-gray-700 pr-5">{entry.description}</p>
                  )}

                  <p className="text-xs text-gray-400 pr-5">
                    {he.history.columns.enteredBy}: {entry.entered_by}
                  </p>
                </div>

                {/* Action row — visible when expanded */}
                {isExpanded && (
                  <div
                    className="px-4 py-2.5 flex gap-2 border-t border-gray-100 bg-gray-50"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => startEdit(entry)}
                      className="btn-secondary text-sm px-3 py-1"
                    >
                      {he.edit}
                    </button>
                    <button
                      onClick={() => void handleDuplicate(entry)}
                      disabled={isSubmitting}
                      className="btn-secondary text-sm px-3 py-1"
                    >
                      {he.history.duplicate}
                    </button>
                    <button
                      onClick={() => void handleDelete(entry)}
                      disabled={isSubmitting}
                      className="text-sm px-3 py-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                    >
                      {he.delete}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Per-client hours breakdown ── */}
      {hoursPerClient.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <span className="text-sm font-semibold text-gray-700">{he.history.hoursPerClient}</span>
          </div>
          <div className="divide-y divide-gray-50">
            {hoursPerClient.map(([client, hours]) => (
              <div key={client} className="flex items-center justify-between px-4 py-2 text-sm">
                <span className="text-gray-700">{client}</span>
                <span className="font-semibold text-blue-600">{hours.toFixed(2)} ש׳</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Export modal ── */}
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
