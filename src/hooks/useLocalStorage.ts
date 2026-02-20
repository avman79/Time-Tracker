/**
 * Generic hook for reading and writing a JSON-serialisable value in localStorage.
 * Mirrors the useState API: returns [value, setter].
 */

import { useState, useCallback } from 'react';

/**
 * Synchronise a React state value with localStorage.
 *
 * @param key - The localStorage key
 * @param initialValue - Default value when the key is absent
 * @returns [storedValue, setValue] — identical API to useState
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item !== null ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T) => {
      try {
        setStoredValue(value);
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch {
        // Silently ignore storage quota errors
      }
    },
    [key],
  );

  return [storedValue, setValue];
}
