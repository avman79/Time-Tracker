/**
 * Hook for managing the current user's name.
 * Persists the username in localStorage.
 * No password — users identify themselves by name only.
 */

import { useLocalStorage } from './useLocalStorage';
import { config } from '../config';

/** Return type for the useUser hook */
export interface UseUserReturn {
  /** Current username, or empty string if not yet set */
  username: string;
  /** Persist a new username */
  setUsername: (name: string) => void;
  /** Whether a username has been set (i.e. first-visit setup is complete) */
  isSetup: boolean;
  /** Clear the stored username (triggers first-visit setup screen) */
  clearUser: () => void;
}

/**
 * Manage the logged-in user's display name.
 * On first visit `isSetup` is false and the app shows a setup screen.
 */
export function useUser(): UseUserReturn {
  const [username, setUsername] = useLocalStorage<string>(config.storageKeys.username, '');

  const isSetup = username.trim().length > 0;

  const clearUser = () => setUsername('');

  return { username, setUsername, isSetup, clearUser };
}
