/**
 * Home page — the primary time-entry form.
 * Fields: client (dropdown + add-new), work_date, hours, worker, worker_count, description.
 * Supports voice input to auto-fill fields.
 */

import { useState, useCallback } from 'react';
import { format } from 'date-fns';
import { he } from '../i18n/he';
import { ClientDropdown } from '../components/ClientDropdown';
import { VoiceButton } from '../components/VoiceButton';
import { useAppContext } from '../context/AppContext';
import { useVoiceInput } from '../hooks/useVoiceInput';
import type { VoiceParseResult } from '../types';

interface FormState {
  client: string;
  work_date: string;
  hours: string;
  worker: string;
  worker_count: string;
  description: string;
}

const EMPTY_FORM: FormState = {
  client: '',
  work_date: format(new Date(), 'yyyy-MM-dd'),
  hours: '',
  worker: '',
  worker_count: '1',
  description: '',
};

/** Simple validation: returns a map of field→error message */
function validate(form: FormState): Partial<Record<keyof FormState, string>> {
  const errors: Partial<Record<keyof FormState, string>> = {};
  if (!form.client) errors.client = he.validation.clientRequired;
  if (!form.hours) errors.hours = he.validation.hoursRequired;
  if (form.hours && isNaN(parseFloat(form.hours))) errors.hours = he.validation.hoursInvalid;
  if (!form.worker) errors.worker = he.validation.workerRequired;
  return errors;
}

/**
 * Entry form page.
 */
export function HomePage() {
  const { clients, workers, addEntry, addClient, isSubmitting, isAuthenticated, signIn, addToast, recordEntry } =
    useAppContext();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const username = useAppContext().username;

  /** Update a single form field */
  const setField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }, []);

  /** Apply voice-parsed result to the form */
  const handleVoiceResult = useCallback(
    (result: VoiceParseResult) => {
      setForm((prev) => ({
        ...prev,
        ...(result.client !== undefined ? { client: result.client } : {}),
        ...(result.hours !== undefined ? { hours: String(result.hours) } : {}),
        ...(result.work_date !== undefined ? { work_date: result.work_date } : {}),
        ...(result.description !== undefined ? { description: result.description } : {}),
      }));
      addToast(he.voice.filled, 'info');
    },
    [addToast],
  );

  const { isListening, isUnsupported, toggle } = useVoiceInput(
    clients,
    handleVoiceResult,
    (msg) => addToast(msg, 'error'),
  );

  /** Submit the entry */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!isAuthenticated) {
      addToast(he.validation.googleAuthRequired, 'warning');
      return;
    }

    const validationErrors = validate(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      await addEntry({
        entered_by: username,
        client: form.client,
        work_date: form.work_date,
        hours: parseFloat(form.hours),
        worker: form.worker,
        worker_count: parseInt(form.worker_count, 10) || 1,
        description: form.description,
      });
      recordEntry();
      addToast(he.toast.entrySaved, 'success');
      setForm({ ...EMPTY_FORM, work_date: format(new Date(), 'yyyy-MM-dd') });
      setErrors({});
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : he.toast.entrySaveError,
        'error',
      );
    }
  }

  function handleClear() {
    setForm({ ...EMPTY_FORM, work_date: format(new Date(), 'yyyy-MM-dd') });
    setErrors({});
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">{he.form.title}</h1>

      {/* Google auth nudge */}
      {!isAuthenticated && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between gap-3">
          <span className="text-blue-800 text-sm">{he.validation.googleAuthRequired}</span>
          <button onClick={signIn} className="btn-primary text-sm shrink-0">
            {he.settings.signInWithGoogle}
          </button>
        </div>
      )}

      <form onSubmit={(e) => void handleSubmit(e)} noValidate className="space-y-4">
        {/* Client */}
        <div>
          <label className="label">{he.form.client}</label>
          <div className="flex gap-2 items-start">
            <div className="flex-1">
              <ClientDropdown
                clients={clients}
                value={form.client}
                onChange={(v) => setField('client', v)}
                onAddClient={async (name) => {
                  try {
                    await addClient(name);
                    addToast(he.toast.clientAdded, 'success');
                  } catch {
                    addToast(he.toast.clientAddError, 'error');
                    throw new Error(he.toast.clientAddError);
                  }
                }}
                disabled={isSubmitting}
              />
            </div>
            <VoiceButton
              isListening={isListening}
              isUnsupported={isUnsupported}
              onToggle={toggle}
            />
          </div>
          {errors.client && <p className="error-msg">{errors.client}</p>}
        </div>

        {/* Work date */}
        <div>
          <label className="label">{he.form.workDate}</label>
          <input
            type="date"
            className="input"
            value={form.work_date}
            onChange={(e) => setField('work_date', e.target.value)}
          />
        </div>

        {/* Hours + Worker count */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">{he.form.hours}</label>
            <input
              type="number"
              step="0.25"
              min="0"
              max="24"
              placeholder={he.form.hoursPlaceholder}
              className={`input ${errors.hours ? 'border-red-500' : ''}`}
              value={form.hours}
              onChange={(e) => setField('hours', e.target.value)}
            />
            {errors.hours && <p className="error-msg">{errors.hours}</p>}
          </div>

          <div>
            <label className="label">{he.form.workerCount}</label>
            <input
              type="number"
              min="1"
              className="input"
              value={form.worker_count}
              onChange={(e) => setField('worker_count', e.target.value)}
            />
          </div>
        </div>

        {/* Worker */}
        <div>
          <label className="label">{he.form.worker}</label>
          <select
            className={`input ${errors.worker ? 'border-red-500' : ''}`}
            value={form.worker}
            onChange={(e) => setField('worker', e.target.value)}
          >
            <option value="">{he.form.workerPlaceholder}</option>
            {workers.map((w) => (
              <option key={w} value={w}>{w}</option>
            ))}
          </select>
          {errors.worker && <p className="error-msg">{errors.worker}</p>}
        </div>

        {/* Description */}
        <div>
          <label className="label">{he.form.description}</label>
          <textarea
            rows={3}
            placeholder={he.form.descriptionPlaceholder}
            className="input resize-none"
            value={form.description}
            onChange={(e) => setField('description', e.target.value)}
          />
        </div>

        {/* Entered by (read-only) */}
        <p className="text-xs text-gray-400">
          {he.form.enteredBy}: <strong>{username}</strong>
        </p>

        {/* Actions */}
        <div className="flex gap-3">
          <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
            {isSubmitting ? he.loading : he.form.submit}
          </button>
          <button type="button" onClick={handleClear} className="btn-secondary">
            {he.form.clear}
          </button>
        </div>
      </form>
    </div>
  );
}
