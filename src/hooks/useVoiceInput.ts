/**
 * Hook that manages the lifecycle of a Web Speech API recognition session.
 * Returns the transcript and a toggle function.
 */

import { useState, useCallback, useRef } from 'react';
import { createRecognition, parseVoiceTranscript } from '../services/voiceService';
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

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
      const parsed = parseVoiceTranscript(text, knownClients);
      setLastResult(parsed);
      onResult(parsed);
    };

    recognition.onerror = () => {
      onError('שגיאה בקלט הקולי — נסה שוב');
      setIsListening(false);
    };

    recognition.onend = () => setIsListening(false);

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
