/**
 * Client selector dropdown with an inline "add new client" flow.
 * When the user picks "הוסף לקוח חדש" a text input appears to enter the name.
 */

import { useState } from 'react';
import { he } from '../i18n/he';

const ADD_NEW_VALUE = '__add_new__';

interface ClientDropdownProps {
  clients: string[];
  value: string;
  onChange: (client: string) => void;
  /** Called when the user confirms a new client name */
  onAddClient: (name: string) => Promise<void>;
  disabled?: boolean;
}

/**
 * Render a select element for picking a client with an option to add a new one.
 */
export function ClientDropdown({
  clients,
  value,
  onChange,
  onAddClient,
  disabled = false,
}: ClientDropdownProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  /** Handle selection change — intercept the "add new" option */
  function handleSelectChange(e: React.ChangeEvent<HTMLSelectElement>) {
    if (e.target.value === ADD_NEW_VALUE) {
      setIsAdding(true);
      setNewClientName('');
    } else {
      onChange(e.target.value);
    }
  }

  /** Confirm and save the new client */
  async function handleConfirm() {
    const trimmed = newClientName.trim();
    if (!trimmed) return;

    setIsSaving(true);
    try {
      await onAddClient(trimmed);
      onChange(trimmed);
      setIsAdding(false);
      setNewClientName('');
    } finally {
      setIsSaving(false);
    }
  }

  /** Cancel inline add */
  function handleCancel() {
    setIsAdding(false);
    setNewClientName('');
  }

  if (isAdding) {
    return (
      <div className="flex gap-2">
        <input
          type="text"
          value={newClientName}
          onChange={(e) => setNewClientName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void handleConfirm();
            if (e.key === 'Escape') handleCancel();
          }}
          placeholder={he.form.newClientPlaceholder}
          className="input flex-1"
          autoFocus
          disabled={isSaving}
        />
        <button
          type="button"
          onClick={() => void handleConfirm()}
          disabled={isSaving || !newClientName.trim()}
          className="btn-primary text-sm px-3"
        >
          {isSaving ? '...' : he.add}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          className="btn-secondary text-sm px-3"
        >
          {he.cancel}
        </button>
      </div>
    );
  }

  return (
    <select
      value={value}
      onChange={handleSelectChange}
      disabled={disabled}
      className="input"
    >
      <option value="">{he.form.clientPlaceholder}</option>
      {clients.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
      <option value={ADD_NEW_VALUE}>{he.form.addNewClient}</option>
    </select>
  );
}
