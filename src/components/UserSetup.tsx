/**
 * First-visit setup screen.
 * Shown when no username is stored in localStorage.
 * Allows the user to enter their display name to begin using the app.
 */

import { useState } from 'react';
import { he } from '../i18n/he';

interface UserSetupProps {
  onComplete: (name: string) => void;
}

/**
 * Full-screen welcome card prompting for the user's name.
 */
export function UserSetup({ onComplete }: UserSetupProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError(he.userSetup.nameRequired);
      return;
    }
    onComplete(trimmed);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm space-y-6 text-center">
        {/* App icon */}
        <div className="text-5xl">⏱️</div>

        <div>
          <h1 className="text-2xl font-bold text-gray-900">{he.userSetup.welcome}</h1>
          <p className="text-gray-500 mt-1">{he.userSetup.subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError('');
            }}
            placeholder={he.userSetup.namePlaceholder}
            className={`input text-center text-lg ${error ? 'border-red-500' : ''}`}
            autoFocus
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button type="submit" className="btn-primary w-full text-lg py-3">
            {he.userSetup.start}
          </button>
        </form>
      </div>
    </div>
  );
}
