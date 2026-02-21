/**
 * Hook that manages the lifecycle of a Web Speech API recognition session.
 *
 * Behaviour:
 *  - Fields are filled in real-time as each is detected in partial results.
 *  - If a date is detected that is more than 2 days in the future, an error is
 *    shown immediately and the date field is NOT filled.
 *  - When all four fields (client, date, hours, description) are present, a
 *    3-second silence timer starts; recording stops automatically after 3 s of
 *    silence.  New speech resets the timer.
 *  - The user can always stop manually by pressing the mic button.
 *  - onResult is called with isFinal=false for each incremental update and
 *    isFinal=true once recording ends (so callers can show a toast only once).
 */

import { useState, useCallback, useRef } from 'react';
import { createRecognition, parseVoiceTranscript } from '../services/voiceService';
import { he } from '../i18n/he';
import type { VoiceParseResult } from '../types';

/** Return type for the useVoiceInput hook */
export interface UseVoiceInputReturn {
  /** Whether the microphone is currently active */
  isListening: boolean;
  /** True if the current browser does not support SpeechRecognition */
  isUnsupported: boolean;
  /** Start or stop listening */
  toggle: () => void;
  /** Last committed result, or null before first use */
  lastResult: VoiceParseResult | null;
  /** Raw accumulated transcript text */
  transcript: string;
}

/** Returns true when dateStr is more than 2 days in the future. */
function isDateTooFarInFuture(dateStr: string): boolean {
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 2);
  maxDate.setHours(23, 59, 59, 999);
  return new Date(dateStr) > maxDate;
}

/**
 * Handle speech recognition for Hebrew voice input.
 *
 * @param knownClients - Known client names used to improve client extraction
 * @param onResult     - Called on each partial update (isFinal=false) and once
 *                       more on session end (isFinal=true)
 * @param onError      - Called with a Hebrew error message on failure
 */
export function useVoiceInput(
  knownClients: string[],
  onResult: (result: VoiceParseResult, isFinal: boolean) => void,
  onError: (msg: string) => void,
): UseVoiceInputReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [lastResult, setLastResult] = useState<VoiceParseResult | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const accumulatedRef = useRef('');
  const hadErrorRef = useRef(false);
  /** Fields confirmed and sent to the form so far in this session. */
  const prevParsedRef = useRef<VoiceParseResult>({});
  /** Timer ID for the all-fields-detected 3-second silence auto-stop. */
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isUnsupported =
    typeof window !== 'undefined' &&
    !(
      'SpeechRecognition' in window ||
      'webkitSpeechRecognition' in window
    );

  function clearSilenceTimer() {
    if (silenceTimerRef.current !== null) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }

  /**
   * Start a new recognition session.
   */
  const startListening = useCallback(() => {
    const recognition = createRecognition();
    if (!recognition) {
      onError('קלט קולי אינו נתמך בדפדפן זה');
      return;
    }

    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setIsListening(true);
      accumulatedRef.current = '';
      hadErrorRef.current = false;
      prevParsedRef.current = {};
      clearSilenceTimer();
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      // Build cumulative transcript from all final results in this session
      let full = '';
      for (let i = 0; i < event.results.length; i++) {
        full += event.results[i][0].transcript + ' ';
      }
      const text = full.trim();
      accumulatedRef.current = text;
      setTranscript(text);

      const parsed = parseVoiceTranscript(text, knownClients);
      const prev = prevParsedRef.current;

      // Build a partial update containing only newly detected fields.
      const partial: Partial<VoiceParseResult> = {};
      let hasNew = false;

      if (parsed.client !== undefined && parsed.client !== prev.client) {
        partial.client = parsed.client;
        hasNew = true;
      }

      if (parsed.work_date !== undefined && parsed.work_date !== prev.work_date) {
        if (isDateTooFarInFuture(parsed.work_date)) {
          // Show error immediately; do not fill the date field.
          onError(he.validation.dateTooFarInFuture);
        } else {
          partial.work_date = parsed.work_date;
          hasNew = true;
        }
      }

      if (parsed.hours !== undefined && parsed.hours !== prev.hours) {
        partial.hours = parsed.hours;
        hasNew = true;
      }

      if (parsed.description !== undefined && parsed.description !== prev.description) {
        partial.description = parsed.description;
        hasNew = true;
      }

      if (hasNew) {
        prevParsedRef.current = { ...prev, ...partial };
        onResult(partial as VoiceParseResult, false);
      }

      // Manage the all-fields silence timer.
      clearSilenceTimer();
      const filled = prevParsedRef.current;
      const allFilled =
        filled.client !== undefined &&
        filled.work_date !== undefined &&
        filled.hours !== undefined &&
        filled.description !== undefined;

      if (allFilled) {
        // Auto-stop 3 seconds after the last speech result.
        silenceTimerRef.current = setTimeout(() => {
          recognition.stop();
        }, 3000);
      }
    };

    recognition.onerror = () => {
      hadErrorRef.current = true;
      clearSilenceTimer();
      onError('שגיאה בקלט הקולי — נסה שוב');
      setIsListening(false);
    };

    /**
     * onend fires on every stop (auto, silence-timer, or manual).
     * This is the single place where we commit the final result and show the
     * success toast (isFinal=true).
     */
    recognition.onend = () => {
      clearSilenceTimer();
      setIsListening(false);
      if (hadErrorRef.current) return;

      const text = accumulatedRef.current;
      if (!text) return;

      const parsed = parseVoiceTranscript(text, knownClients);

      // Final date validation — clear the date if it is too far in the future.
      if (parsed.work_date && isDateTooFarInFuture(parsed.work_date)) {
        onError(he.validation.dateTooFarInFuture);
        parsed.work_date = undefined;
      }

      setLastResult(parsed);
      onResult(parsed, true);
    };

    recognition.start();
  }, [knownClients, onResult, onError]);

  /**
   * Stop any active recognition session.
   */
  const stopListening = useCallback(() => {
    clearSilenceTimer();
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  /**
   * Toggle listening state.
   */
  const toggle = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return { isListening, isUnsupported, toggle, lastResult, transcript };
}
