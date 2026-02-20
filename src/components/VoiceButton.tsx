/**
 * Microphone toggle button for voice input.
 * Shows an animated indicator while listening.
 */

import { he } from '../i18n/he';

interface VoiceButtonProps {
  isListening: boolean;
  isUnsupported: boolean;
  onToggle: () => void;
}

/**
 * A circular button that activates/deactivates speech recognition.
 */
export function VoiceButton({ isListening, isUnsupported, onToggle }: VoiceButtonProps) {
  if (isUnsupported) {
    return (
      <span
        title={he.voice.notSupported}
        className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-200 text-gray-400 cursor-not-allowed"
        aria-disabled="true"
      >
        🎤
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      title={isListening ? he.voice.listening : he.voice.listenBtn}
      aria-label={isListening ? he.voice.listening : he.voice.listenBtn}
      className={`inline-flex items-center justify-center w-10 h-10 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1
        ${
          isListening
            ? 'bg-red-500 text-white animate-pulse focus:ring-red-400'
            : 'bg-blue-100 text-blue-700 hover:bg-blue-200 focus:ring-blue-400'
        }`}
    >
      🎤
    </button>
  );
}
