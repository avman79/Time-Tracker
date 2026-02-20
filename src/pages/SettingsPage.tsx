/**
 * Settings page.
 * Sections: username, clients management, workers management,
 * reminder configuration, Google account connection, and notification permission.
 */

import { useState } from 'react';
import { he } from '../i18n/he';
import { useAppContext } from '../context/AppContext';
import { requestNotificationPermission, hasNotificationPermission } from '../services/notificationService';
import type { ReminderConfig } from '../types';

/**
 * Settings page component.
 */
export function SettingsPage() {
  const {
    username,
    setUsername,
    clearUser,
    clients,
    workers,
    addClient,
    addWorker,
    isAuthenticated,
    signIn,
    signOut,
    isGISLoaded,
    reminderConfig,
    setReminderConfig,
    addToast,
    refreshAll,
  } = useAppContext();

  // ── Username ──
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(username);

  function saveName() {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    setUsername(trimmed);
    setEditingName(false);
    addToast(he.toast.settingsSaved, 'success');
  }

  // ── Add client ──
  const [newClient, setNewClient] = useState('');
  const [savingClient, setSavingClient] = useState(false);

  async function handleAddClient() {
    const name = newClient.trim();
    if (!name) return;
    setSavingClient(true);
    try {
      await addClient(name);
      addToast(he.toast.clientAdded, 'success');
      setNewClient('');
    } catch {
      addToast(he.toast.clientAddError, 'error');
    } finally {
      setSavingClient(false);
    }
  }

  // ── Add worker ──
  const [newWorker, setNewWorker] = useState('');
  const [savingWorker, setSavingWorker] = useState(false);

  async function handleAddWorker() {
    const name = newWorker.trim();
    if (!name) return;
    setSavingWorker(true);
    try {
      await addWorker(name);
      addToast(he.toast.workerAdded, 'success');
      setNewWorker('');
    } catch {
      addToast(he.toast.workerAddError, 'error');
    } finally {
      setSavingWorker(false);
    }
  }

  // ── Reminder ──
  const [reminder, setReminder] = useState<ReminderConfig>({ ...reminderConfig });

  function saveReminder() {
    setReminderConfig(reminder);
    addToast(he.toast.settingsSaved, 'success');
  }

  // ── Notifications ──
  const [notifGranted, setNotifGranted] = useState(hasNotificationPermission());

  async function handleEnableNotifications() {
    const granted = await requestNotificationPermission();
    setNotifGranted(granted);
    addToast(
      granted ? he.toast.notificationEnabled : he.toast.notificationDenied,
      granted ? 'success' : 'warning',
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">{he.settings.title}</h1>

      {/* ── Username ── */}
      <section className="card">
        <h2 className="section-title">{he.settings.username}</h2>
        {editingName ? (
          <div className="flex gap-2">
            <input
              type="text"
              className="input flex-1"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false); }}
              autoFocus
              placeholder={he.settings.usernamePlaceholder}
            />
            <button onClick={saveName} className="btn-primary text-sm px-3">{he.save}</button>
            <button onClick={() => setEditingName(false)} className="btn-secondary text-sm px-3">{he.cancel}</button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-gray-800 font-medium">{username}</span>
            <button onClick={() => { setNameInput(username); setEditingName(true); }} className="btn-secondary text-sm">
              {he.settings.changeUsername}
            </button>
          </div>
        )}
        <button onClick={clearUser} className="text-xs text-gray-400 hover:text-red-500 mt-2">
          {he.settings.switchUser}
        </button>
      </section>

      {/* ── Clients ── */}
      <section className="card">
        <h2 className="section-title">{he.settings.clientsSection}</h2>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            className="input flex-1"
            placeholder={he.settings.addClientPlaceholder}
            value={newClient}
            onChange={(e) => setNewClient(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void handleAddClient(); }}
            disabled={savingClient}
          />
          <button
            onClick={() => void handleAddClient()}
            disabled={savingClient || !newClient.trim()}
            className="btn-primary text-sm px-3"
          >
            {savingClient ? '...' : he.add}
          </button>
        </div>
        <ul className="space-y-1 max-h-40 overflow-y-auto">
          {clients.length === 0 && <li className="text-sm text-gray-400">{he.noData}</li>}
          {clients.map((c) => (
            <li key={c} className="text-sm text-gray-700 px-2 py-1 bg-gray-50 rounded">{c}</li>
          ))}
        </ul>
      </section>

      {/* ── Workers ── */}
      <section className="card">
        <h2 className="section-title">{he.settings.workersSection}</h2>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            className="input flex-1"
            placeholder={he.settings.addWorkerPlaceholder}
            value={newWorker}
            onChange={(e) => setNewWorker(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void handleAddWorker(); }}
            disabled={savingWorker}
          />
          <button
            onClick={() => void handleAddWorker()}
            disabled={savingWorker || !newWorker.trim()}
            className="btn-primary text-sm px-3"
          >
            {savingWorker ? '...' : he.add}
          </button>
        </div>
        <ul className="space-y-1 max-h-40 overflow-y-auto">
          {workers.length === 0 && <li className="text-sm text-gray-400">{he.noData}</li>}
          {workers.map((w) => (
            <li key={w} className="text-sm text-gray-700 px-2 py-1 bg-gray-50 rounded">{w}</li>
          ))}
        </ul>
      </section>

      {/* ── Reminder ── */}
      <section className="card">
        <h2 className="section-title">{he.settings.reminderSection}</h2>
        <label className="flex items-center gap-3 mb-4 cursor-pointer">
          <input
            type="checkbox"
            checked={reminder.enabled}
            onChange={(e) => setReminder((r) => ({ ...r, enabled: e.target.checked }))}
            className="w-5 h-5 rounded accent-blue-600"
          />
          <span className="text-gray-700">{he.settings.reminderEnabled}</span>
        </label>

        {reminder.enabled && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 shrink-0">{he.settings.remindAfter}</span>
            <input
              type="number"
              min="1"
              className="input w-20 text-center"
              value={reminder.value}
              onChange={(e) => setReminder((r) => ({ ...r, value: parseInt(e.target.value, 10) || 1 }))}
            />
            <select
              className="input flex-1"
              value={reminder.unit}
              onChange={(e) => setReminder((r) => ({ ...r, unit: e.target.value as 'hours' | 'days' }))}
            >
              <option value="hours">{he.settings.reminderUnit.hours}</option>
              <option value="days">{he.settings.reminderUnit.days}</option>
            </select>
          </div>
        )}

        <button onClick={saveReminder} className="btn-primary mt-4 w-full">{he.save}</button>
      </section>

      {/* ── Google ── */}
      <section className="card">
        <h2 className="section-title">{he.settings.googleSection}</h2>
        {isAuthenticated ? (
          <div className="flex items-center justify-between">
            <span className="text-green-600 text-sm font-medium">✓ {he.settings.connectedAs} Google</span>
            <button onClick={signOut} className="btn-secondary text-sm">{he.settings.disconnect}</button>
          </div>
        ) : (
          <button
            onClick={signIn}
            disabled={!isGISLoaded}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            <span>G</span>
            {he.settings.signInWithGoogle}
          </button>
        )}
        {isAuthenticated && (
          <button onClick={() => void refreshAll()} className="btn-secondary w-full mt-2 text-sm">
            {he.refresh}
          </button>
        )}
      </section>

      {/* ── Notifications ── */}
      <section className="card">
        <h2 className="section-title">{he.settings.enableNotifications}</h2>
        {notifGranted ? (
          <p className="text-green-600 text-sm">✓ {he.toast.notificationEnabled}</p>
        ) : (
          <button onClick={() => void handleEnableNotifications()} className="btn-secondary w-full">
            {he.settings.enableNotifications}
          </button>
        )}
      </section>
    </div>
  );
}
