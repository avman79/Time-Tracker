/**
 * Hook that manages the lifecycle of a Web Speech API recognition session.
 * With continuous=true, the session keeps recording until:
 *   - Both hours AND description have been detected (auto-stop), or
 *   - The user manually toggles the button (manual stop).
 * The parsed result is committed to the form exactly once, in onend.
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
  /** Last parsed result, or null before first use */
  lastResult: VoiceParseResult | null;
  /** Raw transcript text */
  transcript: string;
}

/**
 * Handle speech recognition for Hebrew voice input.
 *
 * @param knownClients - Known client names used to improve client extraction
 * @param onResult - Called with the parsed result when recognition ends successfully
 * @param onError - Called with a Hebrew error message on failure
 */
export function useVoiceInput(
  knownClients: string[],
  onResult: (result: VoiceParseResult) => void,
  onError: (msg: string) => void,
): UseVoiceInputReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [lastResult, setLastResult] = useState<VoiceParseResult | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const accumulatedRef = useRef('');
  const hadErrorRef = useRef(false);

  const isUnsupported =
    typeof window !== 'undefined' &&
    !(
      'SpeechRecognition' in window ||
      'webkitSpeechRecognition' in window
    );

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

      // Auto-stop once both hours and description are present
      const parsed = parseVoiceTranscript(text, knownClients);
      if (parsed.hours !== undefined && parsed.description !== undefined) {
        recognition.stop();
      }
    };

    recognition.onerror = () => {
      hadErrorRef.current = true;
      onError('שגיאה בקלט הקולי — נסה שוב');
      setIsListening(false);
    };

    /**
     * onend fires on every stop (auto or manual).
     * This is the single place where we commit the result to the form.
     */
    recognition.onend = () => {
      setIsListening(false);
      if (hadErrorRef.current) return;

      const text = accumulatedRef.current;
      if (!text) return;

      const parsed = parseVoiceTranscript(text, knownClients);

      // Reject dates more than 2 days in the future
      if (parsed.work_date) {
        const maxDate = new Date();
        maxDate.setDate(maxDate.getDate() + 2);
        maxDate.setHours(23, 59, 59, 999);
        if (new Date(parsed.work_date) > maxDate) {
          onError(he.validation.dateTooFarInFuture);
          setLastResult({ ...parsed, work_date: undefined });
          onResult({ ...parsed, work_date: undefined });
          return;
        }
      }

      setLastResult(parsed);
      onResult(parsed);
    };

    recognition.start();
  }, [knownClients, onResult, onError]);

  /**
   * Stop any active recognition session.
   */
  const stopListening = useCallback(() => {
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
