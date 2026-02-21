/**
 * Hook that wraps the Google Sheets service and manages OAuth state.
 *
 * Authentication uses Google Identity Services (GIS).
 * The GIS script must be loaded before this hook can sign the user in — it is
 * loaded eagerly in index.html.
 *
 * Access tokens expire after ~1 hour; the hook automatically invalidates the
 * token after 55 minutes so the user is prompted to re-authenticate.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { config } from '../config';
import {
  fetchClients,
  fetchWorkers,
  fetchEntries,
  appendEntry,
  appendClient,
  appendWorker,
  deleteEntry as deleteEntryRow,
  updateEntry as updateEntryRow,
  refreshSummary,
  ensureHeaders,
} from '../services/googleSheets';
import type { TimeEntry } from '../types';

const TOKEN_EXPIRY_MS = 55 * 60 * 1000; // 55 minutes

/** Return type for the useGoogleSheets hook */
export interface UseGoogleSheetsReturn {
  // ── Auth ──
  isGISLoaded: boolean;
  isAuthenticated: boolean;
  signIn: () => void;
  signOut: () => void;

  // ── Data ──
  clients: string[];
  workers: string[];
  entries: TimeEntry[];

  // ── Loading flags ──
  isLoadingClients: boolean;
  isLoadingWorkers: boolean;
  isLoadingEntries: boolean;
  isSubmitting: boolean;

  // ── Actions ──
  addEntry: (entry: Omit<TimeEntry, 'id' | 'entry_timestamp'>) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  updateEntry: (entry: TimeEntry) => Promise<void>;
  addClient: (name: string) => Promise<void>;
  addWorker: (name: string) => Promise<void>;
  refreshEntries: () => Promise<void>;
  refreshAll: () => Promise<void>;
}

/**
 * Integrate with Google Sheets via OAuth 2.0 and the Sheets REST API.
 *
 * @param onError - Callback invoked with a Hebrew error message on failure
 */
export function useGoogleSheets(onError: (msg: string) => void): UseGoogleSheetsReturn {
  const [isGISLoaded, setIsGISLoaded] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const [clients, setClients] = useState<string[]>([]);
  const [workers, setWorkers] = useState<string[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);

  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [isLoadingWorkers, setIsLoadingWorkers] = useState(false);
  const [isLoadingEntries, setIsLoadingEntries] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const tokenClientRef = useRef<{ requestAccessToken: (opts?: { prompt?: string }) => void } | null>(null);
  const tokenExpiryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── GIS script detection ──────────────────────────────────────────────────

  useEffect(() => {
    /** Poll until the GIS script exposes window.google */
    const poll = setInterval(() => {
      if (window.google?.accounts?.oauth2) {
        clearInterval(poll);
        setIsGISLoaded(true);
      }
    }, 200);
    return () => clearInterval(poll);
  }, []);

  // ── Initialize token client once GIS is ready ─────────────────────────────

  useEffect(() => {
    if (!isGISLoaded || !config.googleClientId) return;

    tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
      client_id: config.googleClientId,
      scope: config.oauthScope,
      callback: (response) => {
        if (response.error) {
          onError('שגיאה בהתחברות ל-Google');
          return;
        }
        setAccessToken(response.access_token);
        setIsAuthenticated(true);

        // Automatically invalidate the token just before it expires
        if (tokenExpiryRef.current) clearTimeout(tokenExpiryRef.current);
        tokenExpiryRef.current = setTimeout(() => {
          setAccessToken(null);
          setIsAuthenticated(false);
        }, TOKEN_EXPIRY_MS);
      },
    });
  }, [isGISLoaded, onError]);

  // ── Load public data (clients + workers) on mount ─────────────────────────

  useEffect(() => {
    if (!config.sheetId || !config.apiKey) return;
    void loadClients();
    void loadWorkers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const loadClients = useCallback(async () => {
    setIsLoadingClients(true);
    try {
      setClients(await fetchClients());
    } catch {
      onError('שגיאה בטעינת רשימת הלקוחות');
    } finally {
      setIsLoadingClients(false);
    }
  }, [onError]);

  const loadWorkers = useCallback(async () => {
    setIsLoadingWorkers(true);
    try {
      setWorkers(await fetchWorkers());
    } catch {
      onError('שגיאה בטעינת רשימת העובדים');
    } finally {
      setIsLoadingWorkers(false);
    }
  }, [onError]);

  const loadEntries = useCallback(async () => {
    setIsLoadingEntries(true);
    try {
      setEntries(await fetchEntries());
    } catch {
      onError('שגיאה בטעינת הרשומות');
    } finally {
      setIsLoadingEntries(false);
    }
  }, [onError]);

  // ── Auth actions ──────────────────────────────────────────────────────────

  const signIn = useCallback(() => {
    tokenClientRef.current?.requestAccessToken({ prompt: 'consent' });
  }, []);

  const signOut = useCallback(() => {
    if (accessToken) {
      window.google?.accounts?.oauth2?.revoke(accessToken, () => {});
    }
    if (tokenExpiryRef.current) clearTimeout(tokenExpiryRef.current);
    setAccessToken(null);
    setIsAuthenticated(false);
  }, [accessToken]);

  // ── Data mutation actions ─────────────────────────────────────────────────

  /**
   * Submit a new time entry to Sheet1 and refresh the summary in Sheet2.
   */
  const addEntry = useCallback(
    async (entry: Omit<TimeEntry, 'id' | 'entry_timestamp'>) => {
      if (!accessToken) {
        onError('נא להתחבר לחשבון Google לפני שמירת נתונים');
        return;
      }
      setIsSubmitting(true);
      try {
        const fullEntry: Omit<TimeEntry, 'id'> = {
          ...entry,
          entry_timestamp: new Date().toISOString(),
        };
        await appendEntry(fullEntry, accessToken);

        // Refresh local entries list and recompute summary
        const updatedEntries = await fetchEntries();
        setEntries(updatedEntries);
        await refreshSummary(updatedEntries, accessToken);
      } finally {
        setIsSubmitting(false);
      }
    },
    [accessToken, onError],
  );

  /**
   * Add a new client to Sheet3 and update the local list.
   */
  const addClient = useCallback(
    async (name: string) => {
      if (!accessToken) {
        onError('נא להתחבר לחשבון Google');
        return;
      }
      await appendClient(name, accessToken);
      setClients((prev) => [...prev, name]);

      // Ensure Sheet1 headers exist on first use
      await ensureHeaders(accessToken).catch(() => {});
    },
    [accessToken, onError],
  );

  /**
   * Add a new worker to Sheet4 and update the local list.
   */
  const addWorker = useCallback(
    async (name: string) => {
      if (!accessToken) {
        onError('נא להתחבר לחשבון Google');
        return;
      }
      await appendWorker(name, accessToken);
      setWorkers((prev) => [...prev, name]);
    },
    [accessToken, onError],
  );

  /**
   * Delete a time entry row from Sheet1 and refresh local state.
   */
  const deleteEntry = useCallback(
    async (id: string) => {
      if (!accessToken) { onError('נא להתחבר לחשבון Google'); return; }
      setIsSubmitting(true);
      try {
        await deleteEntryRow(id, accessToken);
        const updated = await fetchEntries();
        setEntries(updated);
        await refreshSummary(updated, accessToken);
      } finally {
        setIsSubmitting(false);
      }
    },
    [accessToken, onError],
  );

  /**
   * Overwrite a time entry row in Sheet1 and refresh local state.
   */
  const updateEntry = useCallback(
    async (entry: TimeEntry) => {
      if (!accessToken) { onError('נא להתחבר לחשבון Google'); return; }
      setIsSubmitting(true);
      try {
        await updateEntryRow(entry, accessToken);
        const updated = await fetchEntries();
        setEntries(updated);
        await refreshSummary(updated, accessToken);
      } finally {
        setIsSubmitting(false);
      }
    },
    [accessToken, onError],
  );

  const refreshEntries = useCallback(() => loadEntries(), [loadEntries]);
  const refreshAll = useCallback(async () => {
    await Promise.all([loadClients(), loadWorkers(), loadEntries()]);
  }, [loadClients, loadWorkers, loadEntries]);

  return {
    isGISLoaded,
    isAuthenticated,
    signIn,
    signOut,
    clients,
    workers,
    entries,
    isLoadingClients,
    isLoadingWorkers,
    isLoadingEntries,
    isSubmitting,
    addEntry,
    deleteEntry,
    updateEntry,
    addClient,
    addWorker,
    refreshEntries,
    refreshAll,
  };
}
